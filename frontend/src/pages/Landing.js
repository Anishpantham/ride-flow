import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Car, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ThemeToggle } from '@/components/ThemeToggle';

export const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <div 
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1762997222467-dced65a8a354?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxODh8MHwxfHNlYXJjaHwxfHx1cmJhbiUyMGNpdHklMjBzdHJlZXQlMjB0YXhpfGVufDB8fHx8MTc2OTUyMDI2M3ww&ixlib=rb-4.1.0&q=85')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
      </div>

      {/* Theme Toggle */}
      <div className="absolute top-6 right-6 z-20">
        <ThemeToggle />
      </div>

      {/* Content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen px-4">
        <div className="max-w-4xl w-full space-y-12">
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-white tracking-tight">
              RideFlow
            </h1>
            <p className="text-xl sm:text-2xl text-white/90 font-medium max-w-2xl mx-auto">
              Negotiate. Ride. Pay. Your way.
            </p>
          </div>

          {/* Role Selection Cards */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Passenger Card */}
            <Card 
              data-testid="passenger-card"
              className="group relative overflow-hidden border-2 border-white/10 bg-white/10 dark:bg-black/40 backdrop-blur-2xl hover:border-[#007AFF] transition-all duration-300 cursor-pointer transform hover:scale-105"
              onClick={() => navigate('/auth?role=passenger')}
            >
              <div className="p-8 space-y-6">
                <div className="w-16 h-16 rounded-full bg-[#007AFF]/20 flex items-center justify-center">
                  <User className="w-8 h-8 text-[#007AFF]" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-white">I'm a Passenger</h3>
                  <p className="text-white/70">Request rides and negotiate fair prices</p>
                </div>
                <Button 
                  data-testid="passenger-button"
                  className="w-full bg-[#007AFF] hover:bg-[#0062CC] text-white rounded-full font-bold py-6 text-lg"
                >
                  Continue as Passenger
                </Button>
              </div>
            </Card>

            {/* Driver Card */}
            <Card 
              data-testid="driver-card"
              className="group relative overflow-hidden border-2 border-white/10 bg-white/10 dark:bg-black/40 backdrop-blur-2xl hover:border-[#007AFF] transition-all duration-300 cursor-pointer transform hover:scale-105"
              onClick={() => navigate('/auth?role=driver')}
            >
              <div className="p-8 space-y-6">
                <div className="w-16 h-16 rounded-full bg-[#007AFF]/20 flex items-center justify-center">
                  <Car className="w-8 h-8 text-[#007AFF]" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-white">I'm a Driver</h3>
                  <p className="text-white/70">Accept rides and set your own prices</p>
                </div>
                <Button 
                  data-testid="driver-button"
                  className="w-full bg-[#007AFF] hover:bg-[#0062CC] text-white rounded-full font-bold py-6 text-lg"
                >
                  Continue as Driver
                </Button>
              </div>
            </Card>
          </div>

          {/* Features */}
          <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto">
            <div className="text-center space-y-2">
              <div className="text-3xl font-extrabold text-[#007AFF]">100%</div>
              <div className="text-sm text-white/80">Transparent Pricing</div>
            </div>
            <div className="text-center space-y-2">
              <div className="text-3xl font-extrabold text-[#007AFF]">Real-time</div>
              <div className="text-sm text-white/80">GPS Tracking</div>
            </div>
            <div className="text-center space-y-2">
              <div className="text-3xl font-extrabold text-[#007AFF]">Secure</div>
              <div className="text-sm text-white/80">OTP Verification</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};