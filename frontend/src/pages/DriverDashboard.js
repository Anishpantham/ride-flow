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
import { MapPin, Navigation, MessageSquare, DollarSign, LogOut, Send, CheckCircle, Loader2, Car } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const DriverDashboard = () => {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  
  const [availableRides, setAvailableRides] = useState([]);
  const [activeRide, setActiveRide] = useState(null);
  const [myRides, setMyRides] = useState([]);
  const [showProposeDialog, setShowProposeDialog] = useState(false);
  const [showChatDialog, setShowChatDialog] = useState(false);
  const [showOTPDialog, setShowOTPDialog] = useState(false);
  const [selectedRide, setSelectedRide] = useState(null);
  const [proposedFare, setProposedFare] = useState('');
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const pollInterval = useRef(null);

  useEffect(() => {
    if (!user || user.role !== 'driver') {
      navigate('/auth?role=driver');
      return;
    }
    fetchAvailableRides();
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
      fetchMyRides();
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

  const fetchAvailableRides = async () => {
    try {
      const response = await axios.get(`${API}/rides/available`, getAuthHeaders(token));
      setAvailableRides(response.data.rides);
    } catch (error) {
      console.error('Failed to fetch available rides:', error);
    }
  };

  const fetchMyRides = async () => {
    try {
      const response = await axios.get(`${API}/rides/my-rides`, getAuthHeaders(token));
      setMyRides(response.data.rides);
      const active = response.data.rides.find(r => ['fare_proposed', 'negotiating', 'in_progress'].includes(r.status));
      if (active) {
        setActiveRide(active);
      }
    } catch (error) {
      console.error('Failed to fetch my rides:', error);
    }
  };

  const fetchRideDetails = async (rideId) => {
    try {
      const response = await axios.get(`${API}/rides/${rideId}`, getAuthHeaders(token));
      setActiveRide(response.data);
      
      if (response.data.status === 'in_progress' && !showOTPDialog) {
        toast.success('Ride confirmed! Passenger accepted your fare.');
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

  const proposeFare = async () => {
    if (!proposedFare || isNaN(proposedFare)) {
      toast.error('Please enter a valid fare amount');
      return;
    }

    setLoading(true);
    try {
      await axios.post(
        `${API}/rides/propose-fare`,
        {
          ride_id: selectedRide.id,
          proposed_fare: parseFloat(proposedFare),
          driver_id: user.id,
        },
        getAuthHeaders(token)
      );
      toast.success('Fare proposed successfully!');
      setShowProposeDialog(false);
      setProposedFare('');
      setSelectedRide(null);
      fetchAvailableRides();
      fetchMyRides();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to propose fare');
    } finally {
      setLoading(false);
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

  const sendNewFare = async (amount) => {
    try {
      await axios.post(
        `${API}/rides/update-fare`,
        {
          ride_id: activeRide.id,
          proposed_fare: parseFloat(amount),
          driver_id: user.id,
        },
        getAuthHeaders(token)
      );
      toast.success('New fare offer sent!');
      fetchMessages(activeRide.id);
    } catch (error) {
      toast.error('Failed to send fare offer');
    }
  };

  const verifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      await axios.post(
        `${API}/rides/verify-otp`,
        {
          ride_id: activeRide.id,
          otp: otp,
        },
        getAuthHeaders(token)
      );
      toast.success('Ride completed successfully!');
      setShowOTPDialog(false);
      setOtp('');
      setActiveRide(null);
      fetchMyRides();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
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
      case 'fare_proposed': return 'Waiting for passenger';
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
            <h1 className="text-2xl font-bold">RideFlow Driver</h1>
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

                <div className="space-y-2">
                  <p className="text-sm font-medium">Passenger</p>
                  <p className="text-sm text-muted-foreground">{activeRide.passenger_name}</p>
                  <p className="text-sm text-muted-foreground">{activeRide.passenger_phone}</p>
                  {activeRide.proposed_fare && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-[#007AFF]" />
                      <span className="text-2xl font-bold">${activeRide.proposed_fare}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                {(activeRide.status === 'negotiating' || activeRide.status === 'in_progress') && (
                  <Button
                    data-testid="open-chat-button"
                    onClick={() => {
                      setShowChatDialog(true);
                      fetchMessages(activeRide.id);
                    }}
                    className="flex-1 bg-[#007AFF] hover:bg-[#0062CC]"
                  >
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Open Chat
                  </Button>
                )}
                
                {activeRide.status === 'in_progress' && (
                  <Button
                    data-testid="complete-ride-button"
                    onClick={() => setShowOTPDialog(true)}
                    className="flex-1 bg-[#34C759] hover:bg-[#28A745]"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Complete Ride
                  </Button>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Available Rides */}
        {(!activeRide || ['completed', 'cancelled'].includes(activeRide.status)) && (
          <Card className="p-6 mb-8">
            <h3 className="text-xl font-bold mb-4">Available Rides</h3>
            <div className="space-y-3">
              {availableRides.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No available rides at the moment</p>
              ) : (
                availableRides.map((ride) => (
                  <div
                    key={ride.id}
                    data-testid={`available-ride-${ride.id}`}
                    className="p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-green-500 mt-1" />
                          <div>
                            <p className="text-xs font-medium text-muted-foreground">Pickup</p>
                            <p className="text-sm">{ride.pickup.address}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <Navigation className="h-4 w-4 text-red-500 mt-1" />
                          <div>
                            <p className="text-xs font-medium text-muted-foreground">Destination</p>
                            <p className="text-sm">{ride.destination.address}</p>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">Passenger: {ride.passenger_name}</p>
                      </div>
                      <Button
                        data-testid={`propose-fare-button-${ride.id}`}
                        onClick={() => {
                          setSelectedRide(ride);
                          setShowProposeDialog(true);
                        }}
                        className="bg-[#007AFF] hover:bg-[#0062CC]"
                      >
                        Propose Fare
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        )}

        {/* Ride History */}
        <Card className="p-6">
          <h3 className="text-xl font-bold mb-4">My Rides</h3>
          <div className="space-y-3">
            {myRides.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No rides yet</p>
            ) : (
              myRides.map((ride) => (
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
                  <p className="text-xs text-muted-foreground mt-1">Passenger: {ride.passenger_name}</p>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Propose Fare Dialog */}
      <Dialog open={showProposeDialog} onOpenChange={setShowProposeDialog}>
        <DialogContent data-testid="propose-fare-dialog" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Propose Your Fare</DialogTitle>
            <DialogDescription>Enter the fare you'd like to charge for this ride</DialogDescription>
          </DialogHeader>
          
          {selectedRide && (
            <div className="space-y-6">
              <div className="space-y-2 text-sm">
                <p><strong>Passenger:</strong> {selectedRide.passenger_name}</p>
                <p><strong>Pickup:</strong> {selectedRide.pickup.address}</p>
                <p><strong>Destination:</strong> {selectedRide.destination.address}</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Fare Amount ($)</label>
                <Input
                  data-testid="fare-amount-input"
                  type="number"
                  placeholder="Enter fare amount"
                  value={proposedFare}
                  onChange={(e) => setProposedFare(e.target.value)}
                  className="text-2xl font-bold text-center"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  data-testid="submit-fare-proposal-button"
                  onClick={proposeFare}
                  disabled={loading}
                  className="flex-1 bg-[#007AFF] hover:bg-[#0062CC] text-white rounded-full font-bold py-6"
                >
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Propose Fare
                </Button>
                <Button
                  data-testid="cancel-fare-proposal-button"
                  variant="outline"
                  onClick={() => {
                    setShowProposeDialog(false);
                    setSelectedRide(null);
                    setProposedFare('');
                  }}
                  className="rounded-full"
                >
                  Cancel
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
            <DialogTitle>Chat with Passenger</DialogTitle>
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
                    className={`flex ${msg.sender_role === 'driver' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                        msg.sender_role === 'driver'
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
                data-testid="new-fare-input"
                type="number"
                placeholder="New fare offer"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && e.target.value) {
                    sendNewFare(e.target.value);
                    e.target.value = '';
                  }
                }}
                className="flex-1"
              />
              <Button data-testid="send-new-fare-button" onClick={(e) => {
                const input = e.target.closest('div').querySelector('input');
                if (input.value) {
                  sendNewFare(input.value);
                  input.value = '';
                }
              }}>
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

      {/* OTP Verification Dialog */}
      <Dialog open={showOTPDialog} onOpenChange={setShowOTPDialog}>
        <DialogContent data-testid="otp-dialog" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Complete Ride</DialogTitle>
            <DialogDescription>Enter the OTP provided by the passenger</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">6-Digit OTP</label>
              <Input
                data-testid="otp-input"
                type="text"
                maxLength="6"
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                className="text-3xl font-bold text-center tracking-widest"
              />
            </div>

            <Button
              data-testid="verify-otp-button"
              onClick={verifyOTP}
              disabled={loading || otp.length !== 6}
              className="w-full bg-[#34C759] hover:bg-[#28A745] text-white rounded-full font-bold py-6 text-lg"
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Complete Ride
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};