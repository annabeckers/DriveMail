import urllib.request
import urllib.error
import json
import sys

BASE_URL = "http://127.0.0.1:8000"

def test_endpoint(method, path, data=None):
    url = f"http://127.0.0.1:8000{path}"
    print(f"Testing {method} {url}...")
    
    headers = {'Content-Type': 'application/json'}
    
    try:
        if data:
            req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers=headers, method=method)
        else:
            req = urllib.request.Request(url, headers=headers, method=method)
            
        with urllib.request.urlopen(req) as response:
            status = response.status
            response_body = response.read().decode('utf-8')
            print(f"Status: {status}")
            print(f"Response: {response_body[:200]}...") # Truncate long responses
            print("SUCCESS")
            return True
            
    except urllib.error.HTTPError as e:
        print(f"HTTP Error: {e.code} - {e.reason}")
        print(f"Response: {e.read().decode('utf-8')}")
        return False
    except Exception as e:
        print(f"Error: {e}")
        return False
    print("-" * 30)

def main():
    print("--- Health Check ---")
    if not test_endpoint("GET", "/health"):
        print("Health check failed. Is the server running?")
        return

    print("\n--- AI Generation ---")
    test_endpoint("POST", "/ai/generate", {"prompt": "Hello via API"})

    print("\n--- AI Process Intent ---")
    # Note: user_id 1 must exist for this to work fully, but getting to the logic is success enough
    test_endpoint("POST", "/ai/process_intent", {"text": "Send an email to boss@example.com", "user_id": 1})

    print("\n--- Auth Google (Expected Error without valid token) ---")
    test_endpoint("POST", "/auth/google", {"token": "invalid_token"})

if __name__ == "__main__":
    main()
