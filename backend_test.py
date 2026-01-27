import requests
import sys
import json
from datetime import datetime

class RideFlowAPITester:
    def __init__(self, base_url="https://farenego-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.passenger_token = None
        self.driver_token = None
        self.passenger_user = None
        self.driver_user = None
        self.test_ride_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def run_test(self, name, method, endpoint, expected_status, data=None, token=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = f'Bearer {token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json()
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}")
                self.failed_tests.append({
                    "test": name,
                    "expected": expected_status,
                    "actual": response.status_code,
                    "response": response.text[:200]
                })
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append({
                "test": name,
                "error": str(e)
            })
            return False, {}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        return self.run_test("Root API", "GET", "", 200)

    def test_passenger_registration(self):
        """Test passenger registration"""
        timestamp = datetime.now().strftime('%H%M%S')
        passenger_data = {
            "email": f"passenger_{timestamp}@test.com",
            "password": "TestPass123!",
            "name": f"Test Passenger {timestamp}",
            "phone": "+1234567890",
            "role": "passenger"
        }
        
        success, response = self.run_test(
            "Passenger Registration",
            "POST",
            "auth/register",
            200,
            data=passenger_data
        )
        
        if success and 'token' in response:
            self.passenger_token = response['token']
            self.passenger_user = response['user']
            return True
        return False

    def test_driver_registration(self):
        """Test driver registration"""
        timestamp = datetime.now().strftime('%H%M%S')
        driver_data = {
            "email": f"driver_{timestamp}@test.com",
            "password": "TestPass123!",
            "name": f"Test Driver {timestamp}",
            "phone": "+1234567891",
            "role": "driver",
            "vehicle_info": {
                "model": "Toyota Camry 2020",
                "plate": "ABC-1234"
            }
        }
        
        success, response = self.run_test(
            "Driver Registration",
            "POST",
            "auth/register",
            200,
            data=driver_data
        )
        
        if success and 'token' in response:
            self.driver_token = response['token']
            self.driver_user = response['user']
            return True
        return False

    def test_passenger_login(self):
        """Test passenger login"""
        if not self.passenger_user:
            return False
            
        login_data = {
            "email": self.passenger_user['email'],
            "password": "TestPass123!"
        }
        
        success, response = self.run_test(
            "Passenger Login",
            "POST",
            "auth/login",
            200,
            data=login_data
        )
        return success

    def test_get_user_profile(self):
        """Test get user profile"""
        success, response = self.run_test(
            "Get User Profile",
            "GET",
            "auth/me",
            200,
            token=self.passenger_token
        )
        return success

    def test_request_ride(self):
        """Test ride request"""
        ride_data = {
            "pickup": {
                "lat": 40.7128,
                "lng": -74.0060,
                "address": "123 Main St, New York, NY"
            },
            "destination": {
                "lat": 40.7580,
                "lng": -73.9855,
                "address": "456 Broadway, New York, NY"
            },
            "passenger_id": self.passenger_user['id']
        }
        
        success, response = self.run_test(
            "Request Ride",
            "POST",
            "rides/request",
            200,
            data=ride_data,
            token=self.passenger_token
        )
        
        if success and 'ride_id' in response:
            self.test_ride_id = response['ride_id']
            return True
        return False

    def test_get_available_rides(self):
        """Test get available rides for driver"""
        success, response = self.run_test(
            "Get Available Rides",
            "GET",
            "rides/available",
            200,
            token=self.driver_token
        )
        return success

    def test_propose_fare(self):
        """Test fare proposal by driver"""
        if not self.test_ride_id:
            return False
            
        fare_data = {
            "ride_id": self.test_ride_id,
            "proposed_fare": 25.50,
            "driver_id": self.driver_user['id']
        }
        
        success, response = self.run_test(
            "Propose Fare",
            "POST",
            "rides/propose-fare",
            200,
            data=fare_data,
            token=self.driver_token
        )
        return success

    def test_get_ride_details(self):
        """Test get ride details"""
        if not self.test_ride_id:
            return False
            
        success, response = self.run_test(
            "Get Ride Details",
            "GET",
            f"rides/{self.test_ride_id}",
            200,
            token=self.passenger_token
        )
        return success

    def test_respond_to_fare_negotiate(self):
        """Test passenger responding to fare with negotiate"""
        if not self.test_ride_id:
            return False
            
        response_data = {
            "ride_id": self.test_ride_id,
            "action": "negotiate",
            "counter_offer": 20.00
        }
        
        success, response = self.run_test(
            "Respond to Fare - Negotiate",
            "POST",
            "rides/respond-fare",
            200,
            data=response_data,
            token=self.passenger_token
        )
        return success

    def test_send_chat_message(self):
        """Test sending chat message"""
        if not self.test_ride_id:
            return False
            
        message_data = {
            "ride_id": self.test_ride_id,
            "sender_id": self.passenger_user['id'],
            "message": "Can we meet at the corner?",
            "message_type": "text"
        }
        
        success, response = self.run_test(
            "Send Chat Message",
            "POST",
            "chat/send",
            200,
            data=message_data,
            token=self.passenger_token
        )
        return success

    def test_get_chat_messages(self):
        """Test getting chat messages"""
        if not self.test_ride_id:
            return False
            
        success, response = self.run_test(
            "Get Chat Messages",
            "GET",
            f"chat/{self.test_ride_id}",
            200,
            token=self.passenger_token
        )
        return success

    def test_update_fare(self):
        """Test updating fare during negotiation"""
        if not self.test_ride_id:
            return False
            
        fare_data = {
            "ride_id": self.test_ride_id,
            "proposed_fare": 22.00,
            "driver_id": self.driver_user['id']
        }
        
        success, response = self.run_test(
            "Update Fare",
            "POST",
            "rides/update-fare",
            200,
            data=fare_data,
            token=self.driver_token
        )
        return success

    def test_confirm_fare(self):
        """Test passenger confirming fare"""
        if not self.test_ride_id:
            return False
            
        response_data = {
            "ride_id": self.test_ride_id,
            "action": "confirm"
        }
        
        success, response = self.run_test(
            "Confirm Fare",
            "POST",
            "rides/respond-fare",
            200,
            data=response_data,
            token=self.passenger_token
        )
        
        if success and 'otp' in response:
            self.test_otp = response['otp']
            return True
        return False

    def test_verify_otp(self):
        """Test OTP verification by driver"""
        if not self.test_ride_id or not hasattr(self, 'test_otp'):
            return False
            
        otp_data = {
            "ride_id": self.test_ride_id,
            "otp": self.test_otp
        }
        
        success, response = self.run_test(
            "Verify OTP",
            "POST",
            "rides/verify-otp",
            200,
            data=otp_data,
            token=self.driver_token
        )
        return success

    def test_process_payment(self):
        """Test payment processing"""
        if not self.test_ride_id:
            return False
            
        success, response = self.run_test(
            "Process Payment",
            "POST",
            f"payment/process?ride_id={self.test_ride_id}",
            200,
            token=self.passenger_token
        )
        return success

    def test_get_my_rides(self):
        """Test getting user's rides"""
        success, response = self.run_test(
            "Get My Rides",
            "GET",
            "rides/my-rides",
            200,
            token=self.passenger_token
        )
        return success

    def test_location_update(self):
        """Test location update"""
        location_data = {
            "user_id": self.driver_user['id'],
            "location": {
                "lat": 40.7128,
                "lng": -74.0060,
                "address": "Current Location"
            }
        }
        
        success, response = self.run_test(
            "Update Location",
            "POST",
            "location/update",
            200,
            data=location_data,
            token=self.driver_token
        )
        return success

def main():
    print("🚀 Starting RideFlow API Testing...")
    tester = RideFlowAPITester()
    
    # Test sequence
    tests = [
        ("Root Endpoint", tester.test_root_endpoint),
        ("Passenger Registration", tester.test_passenger_registration),
        ("Driver Registration", tester.test_driver_registration),
        ("Passenger Login", tester.test_passenger_login),
        ("Get User Profile", tester.test_get_user_profile),
        ("Request Ride", tester.test_request_ride),
        ("Get Available Rides", tester.test_get_available_rides),
        ("Propose Fare", tester.test_propose_fare),
        ("Get Ride Details", tester.test_get_ride_details),
        ("Respond to Fare - Negotiate", tester.test_respond_to_fare_negotiate),
        ("Send Chat Message", tester.test_send_chat_message),
        ("Get Chat Messages", tester.test_get_chat_messages),
        ("Update Fare", tester.test_update_fare),
        ("Confirm Fare", tester.test_confirm_fare),
        ("Verify OTP", tester.test_verify_otp),
        ("Process Payment", tester.test_process_payment),
        ("Get My Rides", tester.test_get_my_rides),
        ("Update Location", tester.test_location_update),
    ]
    
    for test_name, test_func in tests:
        try:
            test_func()
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {str(e)}")
            tester.failed_tests.append({
                "test": test_name,
                "error": str(e)
            })
    
    # Print results
    print(f"\n📊 Test Results:")
    print(f"   Tests Run: {tester.tests_run}")
    print(f"   Tests Passed: {tester.tests_passed}")
    print(f"   Tests Failed: {len(tester.failed_tests)}")
    print(f"   Success Rate: {(tester.tests_passed/tester.tests_run*100):.1f}%")
    
    if tester.failed_tests:
        print(f"\n❌ Failed Tests:")
        for failure in tester.failed_tests:
            print(f"   - {failure['test']}: {failure.get('error', f\"Expected {failure.get('expected')}, got {failure.get('actual')}\"")}")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())