import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, getAuthHeaders } from '@/contexts/AuthContext';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ThemeToggle } from '@/components/ThemeToggle';
import { MapComponent } from '@/components/MapComponent';
import { LocationInput } from '@/components/LocationInput';
import { MapPin, Navigation, MessageSquare, Clock, DollarSign, LogOut, X, Send, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const PassengerDashboard = () => {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  
  const [activeRide, setActiveRide] = useState(null);
  const [rides, setRides] = useState([]);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [showFareDialog, setShowFareDialog] = useState(false);
  const [showChatDialog, setShowChatDialog] = useState(false);
  const [showOTPDialog, setShowOTPDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const pollInterval = useRef(null);
  
  const [pickupLocation, setPickupLocation] = useState('');
  const [destinationLocation, setDestinationLocation] = useState('');
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [counterOffer, setCounterOffer] = useState('');

  useEffect(() => {
    if (!user || user.role !== 'passenger') {
      navigate('/auth?role=passenger');
      return;
    }
    fetchMyRides();
  }, [user, navigate]);

  useEffect(() => {
    if (activeRide && (activeRide.status === 'fare_proposed' || activeRide.status === 'negotiating' || activeRide.status === 'in_progress')) {
      startPolling();
    } else {
      stopPolling();
    }
    return () => stopPolling();
  }, [activeRide]);

  const startPolling = () => {
    stopPolling();
    pollInterval.current = setInterval(() => {
      if (activeRide) {
        fetchRideDetails(activeRide.id);
        if (activeRide.status !== 'pending') {
          fetchMessages(activeRide.id);
        }
      }
    }, 3000);
  };

  const stopPolling = () => {
    if (pollInterval.current) {
      clearInterval(pollInterval.current);
      pollInterval.current = null;
    }
  };

  const fetchMyRides = async () => {
    try {
      const response = await axios.get(`${API}/rides/my-rides`, getAuthHeaders(token));
      setRides(response.data.rides);
      const active = response.data.rides.find(r => ['pending', 'fare_proposed', 'negotiating', 'in_progress'].includes(r.status));
      if (active) {
        setActiveRide(active);
        if (active.status === 'fare_proposed') {
          setShowFareDialog(true);
        }
      }
    } catch (error) {
      console.error('Failed to fetch rides:', error);
    }
  };

  const fetchRideDetails = async (rideId) => {
    try {
      const response = await axios.get(`${API}/rides/${rideId}`, getAuthHeaders(token));
      setActiveRide(response.data);
      
      if (response.data.status === 'fare_proposed' && !showFareDialog) {
        setShowFareDialog(true);
        toast.info(`Driver proposed fare: $${response.data.proposed_fare}`);
      }
    } catch (error) {
      console.error('Failed to fetch ride details:', error);
    }
  };

  const fetchMessages = async (rideId) => {
    try {
      setChatLoading(true);
      const response = await axios.get(`${API}/chat/${rideId}`, getAuthHeaders(token));
      setMessages(response.data.messages);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setChatLoading(false);
    }
  };

  const requestRide = async () => {
    if (!pickupLocation || !destinationLocation) {
      toast.error('Please enter both pickup and destination locations');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        `${API}/rides/request`,
        {
          pickup: { lat: 40.7128, lng: -74.0060, address: pickupLocation },
          destination: { lat: 40.7580, lng: -73.9855, address: destinationLocation },
          passenger_id: user.id,
        },
        getAuthHeaders(token)
      );
      toast.success('Ride requested! Waiting for drivers...');
      setShowRequestForm(false);
      setPickupLocation('');
      setDestinationLocation('');
      fetchMyRides();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to request ride');
    } finally {
      setLoading(false);
    }
  };

  const respondToFare = async (action, counter = null) => {
    setLoading(true);
    try {
      const response = await axios.post(
        `${API}/rides/respond-fare`,
        {
          ride_id: activeRide.id,
          action: action,
          counter_offer: counter,
        },
        getAuthHeaders(token)
      );
      
      if (action === 'confirm') {
        toast.success(`Ride confirmed! OTP: ${response.data.otp}`);
        setShowFareDialog(false);
        setShowOTPDialog(true);
      } else if (action === 'negotiate') {
        toast.info('Negotiation started');
        setShowFareDialog(false);
        setShowChatDialog(true);
      } else {
        toast.info('Ride cancelled');
        setShowFareDialog(false);
        setActiveRide(null);
      }
      
      fetchMyRides();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to respond to fare');
    } finally {
      setLoading(false);
      setCounterOffer('');
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      await axios.post(
        `${API}/chat/send`,
        {
          ride_id: activeRide.id,
          sender_id: user.id,
          message: newMessage,
          message_type: 'text',
        },
        getAuthHeaders(token)
      );
      setNewMessage('');
      fetchMessages(activeRide.id);
    } catch (error) {
      toast.error('Failed to send message');
    }
  };

  const sendCounterOffer = async () => {
    if (!counterOffer || isNaN(counterOffer)) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      await axios.post(
        `${API}/rides/update-fare`,
        {
          ride_id: activeRide.id,
          proposed_fare: parseFloat(counterOffer),
          driver_id: activeRide.driver_id,
        },
        getAuthHeaders(token)
      );
      setCounterOffer('');
      toast.success('Counter offer sent!');
      fetchMessages(activeRide.id);
    } catch (error) {
      toast.error('Failed to send counter offer');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'text-yellow-500';
      case 'fare_proposed': return 'text-blue-500';
      case 'negotiating': return 'text-orange-500';
      case 'in_progress': return 'text-green-500';
      case 'completed': return 'text-gray-500';
      case 'cancelled': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'Waiting for driver';
      case 'fare_proposed': return 'Fare proposed';
      case 'negotiating': return 'Negotiating';
      case 'in_progress': return 'In progress';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">RideFlow</h1>
            <p className="text-sm text-muted-foreground">Welcome, {user?.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button data-testid="logout-button" variant="ghost" size="icon" onClick={logout}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Active Ride */}
        {activeRide && activeRide.status !== 'completed' && activeRide.status !== 'cancelled' && (
          <Card data-testid="active-ride-card" className="p-6 mb-8 border-2 border-[#007AFF]/20">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Active Ride</h2>
                <span className={`font-semibold ${getStatusColor(activeRide.status)}`}>
                  {getStatusText(activeRide.status)}
                </span>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-5 w-5 text-green-500 mt-1" />
                    <div>
                      <p className="text-sm font-medium">Pickup</p>
                      <p className="text-sm text-muted-foreground">{activeRide.pickup.address}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Navigation className="h-5 w-5 text-red-500 mt-1" />
                    <div>
                      <p className="text-sm font-medium">Destination</p>
                      <p className="text-sm text-muted-foreground">{activeRide.destination.address}</p>
                    </div>
                  </div>
                </div>

                {activeRide.driver_name && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Driver</p>
                    <p className="text-sm text-muted-foreground">{activeRide.driver_name}</p>
                    <p className="text-sm text-muted-foreground">{activeRide.driver_phone}</p>
                    {activeRide.proposed_fare && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-[#007AFF]" />
                        <span className="text-2xl font-bold">${activeRide.proposed_fare}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {activeRide.status === 'in_progress' && activeRide.otp && (
                <div className="p-4 bg-[#007AFF]/10 rounded-lg">
                  <p className="text-sm font-medium mb-1">Your OTP</p>
                  <p className="text-3xl font-bold tracking-widest">{activeRide.otp}</p>
                  <p className="text-xs text-muted-foreground mt-1">Share this with driver at destination</p>
                </div>
              )}

              {(activeRide.status === 'negotiating' || activeRide.status === 'in_progress') && (
                <Button
                  data-testid="open-chat-button"
                  onClick={() => {
                    setShowChatDialog(true);
                    fetchMessages(activeRide.id);
                  }}
                  className="w-full bg-[#007AFF] hover:bg-[#0062CC]"
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Open Chat
                </Button>
              )}
            </div>
          </Card>
        )}

        {/* Request New Ride */}
        {!activeRide || ['completed', 'cancelled'].includes(activeRide.status) ? (
          <Card className="p-6 mb-8">
            {!showRequestForm ? (
              <Button
                data-testid="request-ride-button"
                onClick={() => setShowRequestForm(true)}
                className="w-full bg-[#007AFF] hover:bg-[#0062CC] text-white rounded-full font-bold py-6 text-lg"
              >
                Request New Ride
              </Button>
            ) : (
              <div className="space-y-4">
                <h3 className="text-xl font-bold">Request a Ride</h3>
                <LocationInput
                  label="Pickup Location"
                  value={pickupLocation}
                  onChange={setPickupLocation}
                  placeholder="Enter pickup address"
                />
                <LocationInput
                  label="Destination"
                  value={destinationLocation}
                  onChange={setDestinationLocation}
                  placeholder="Enter destination address"
                />
                <div className="flex gap-2">
                  <Button
                    data-testid="submit-ride-request-button"
                    onClick={requestRide}
                    disabled={loading}
                    className="flex-1 bg-[#007AFF] hover:bg-[#0062CC]"
                  >
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Request Ride
                  </Button>
                  <Button
                    data-testid="cancel-ride-request-button"
                    variant="outline"
                    onClick={() => setShowRequestForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </Card>
        ) : null}

        {/* Ride History */}
        <Card className="p-6">
          <h3 className="text-xl font-bold mb-4">Ride History</h3>
          <div className="space-y-3">
            {rides.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No rides yet</p>
            ) : (
              rides.map((ride) => (
                <div
                  key={ride.id}
                  data-testid={`ride-history-item-${ride.id}`}
                  className="p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-medium ${getStatusColor(ride.status)}`}>
                      {getStatusText(ride.status)}
                    </span>
                    {ride.agreed_fare && (
                      <span className="text-lg font-bold">${ride.agreed_fare}</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {ride.pickup.address} → {ride.destination.address}
                  </p>
                  {ride.driver_name && (
                    <p className="text-xs text-muted-foreground mt-1">Driver: {ride.driver_name}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Fare Proposal Dialog */}
      <Dialog open={showFareDialog} onOpenChange={setShowFareDialog}>
        <DialogContent data-testid="fare-proposal-dialog" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Fare Proposal</DialogTitle>
            <DialogDescription>The driver has proposed a fare for your ride</DialogDescription>
          </DialogHeader>
          
          {activeRide && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">Proposed Fare</p>
                <p className="text-5xl font-extrabold text-[#007AFF]">${activeRide.proposed_fare}</p>
              </div>

              <div className="space-y-2 text-sm">
                <p><strong>Driver:</strong> {activeRide.driver_name}</p>
                <p><strong>Pickup:</strong> {activeRide.pickup.address}</p>
                <p><strong>Destination:</strong> {activeRide.destination.address}</p>
              </div>

              <div className="space-y-2">
                <Button
                  data-testid="confirm-fare-button"
                  onClick={() => respondToFare('confirm')}
                  disabled={loading}
                  className="w-full bg-[#34C759] hover:bg-[#28A745] text-white rounded-full font-bold py-6 text-lg"
                >
                  <CheckCircle className="mr-2 h-5 w-5" />
                  Confirm & Book Ride
                </Button>
                
                <Button
                  data-testid="negotiate-fare-button"
                  onClick={() => respondToFare('negotiate')}
                  disabled={loading}
                  className="w-full bg-[#FF9500] hover:bg-[#E08600] text-white rounded-full font-bold py-6 text-lg"
                >
                  <MessageSquare className="mr-2 h-5 w-5" />
                  Negotiate Further
                </Button>
                
                <Button
                  data-testid="cancel-fare-button"
                  onClick={() => respondToFare('cancel')}
                  disabled={loading}
                  variant="outline"
                  className="w-full border-2 rounded-full font-bold py-6 text-lg"
                >
                  <X className="mr-2 h-5 w-5" />
                  Cancel Ride
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Chat Dialog */}
      <Dialog open={showChatDialog} onOpenChange={setShowChatDialog}>
        <DialogContent data-testid="chat-dialog" className="max-w-2xl h-[600px] flex flex-col">
          <DialogHeader>
            <DialogTitle>Chat with Driver</DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-3">
              {chatLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No messages yet</p>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    data-testid={`chat-message-${msg.id}`}
                    className={`flex ${msg.sender_role === 'passenger' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                        msg.sender_role === 'passenger'
                          ? 'bg-[#007AFF] text-white'
                          : 'bg-muted'
                      } ${msg.message_type === 'fare_proposal' ? 'border-2 border-[#007AFF]' : ''}`}
                    >
                      <p className="text-xs opacity-70 mb-1">{msg.sender_name}</p>
                      <p className="text-sm">{msg.message}</p>
                      {msg.fare_amount && (
                        <p className="text-lg font-bold mt-1">${msg.fare_amount}</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          <div className="space-y-2 pt-4 border-t">
            <div className="flex gap-2">
              <Input
                data-testid="counter-offer-input"
                type="number"
                placeholder="Counter offer amount"
                value={counterOffer}
                onChange={(e) => setCounterOffer(e.target.value)}
                className="flex-1"
              />
              <Button data-testid="send-counter-offer-button" onClick={sendCounterOffer}>
                Send Offer
              </Button>
            </div>
            <div className="flex gap-2">
              <Input
                data-testid="chat-message-input"
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                className="flex-1"
              />
              <Button data-testid="send-message-button" onClick={sendMessage}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};