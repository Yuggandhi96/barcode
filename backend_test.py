import requests
import json
import time
import os
import io
import zipfile
import base64
from dotenv import load_dotenv
import sys
import uuid

# Load environment variables from frontend/.env to get the backend URL
load_dotenv("frontend/.env")
BACKEND_URL = os.environ.get("REACT_APP_BACKEND_URL")
API_BASE_URL = f"{BACKEND_URL}/api"

print(f"Testing backend API at: {API_BASE_URL}")

# Test results tracking
test_results = {
    "passed": 0,
    "failed": 0,
    "tests": []
}

def log_test(name, passed, message=""):
    """Log test result"""
    status = "PASSED" if passed else "FAILED"
    print(f"[{status}] {name}: {message}")
    test_results["tests"].append({
        "name": name,
        "passed": passed,
        "message": message
    })
    if passed:
        test_results["passed"] += 1
    else:
        test_results["failed"] += 1

def test_barcode_types_api():
    """Test the barcode types API"""
    print("\n=== Testing Barcode Types API ===")
    
    # Test getting all barcode types
    response = requests.get(f"{API_BASE_URL}/barcode-types")
    
    # Check status code
    if response.status_code != 200:
        log_test("Barcode Types API", False, f"Expected status code 200, got {response.status_code}")
        return
    
    # Check response structure
    data = response.json()
    if "barcode_types" not in data:
        log_test("Barcode Types API Structure", False, "Response missing 'barcode_types' key")
        return
    
    # Check if all 6 barcode types are present
    barcode_types = data["barcode_types"]
    expected_types = ["qr_code", "code128", "ean13", "upc", "code39", "datamatrix"]
    missing_types = [t for t in expected_types if t not in barcode_types]
    
    if missing_types:
        log_test("Barcode Types Completeness", False, f"Missing barcode types: {', '.join(missing_types)}")
    else:
        log_test("Barcode Types Completeness", True, "All 6 barcode types are present")
    
    # Check if each type has name and price
    invalid_types = []
    for type_key, type_data in barcode_types.items():
        if "name" not in type_data or "price" not in type_data:
            invalid_types.append(type_key)
    
    if invalid_types:
        log_test("Barcode Types Structure", False, f"Invalid structure for types: {', '.join(invalid_types)}")
    else:
        log_test("Barcode Types Structure", True, "All barcode types have proper structure with name and price")

def test_price_calculation_api():
    """Test the price calculation API"""
    print("\n=== Testing Price Calculation API ===")
    
    # Test 1: Valid calculation for Gujarat state
    response = requests.post(f"{API_BASE_URL}/calculate-price?barcode_type=qr_code&quantity=100&state=Gujarat")
    
    if response.status_code != 200:
        log_test("Price Calculation - Valid (Gujarat)", False, f"Expected status code 200, got {response.status_code}")
    else:
        data = response.json()
        # Check basic structure
        if all(k in data for k in ["barcode_type", "quantity", "unit_price", "pricing"]):
            # Check tax calculation for Gujarat (CGST + SGST)
            pricing = data["pricing"]
            if "cgst" in pricing and "sgst" in pricing and "total_amount" in pricing:
                # Verify tax calculation
                base_amount = data["unit_price"] * data["quantity"]
                expected_tax = base_amount * 0.18
                expected_cgst = base_amount * 0.09
                expected_sgst = base_amount * 0.09
                expected_total = base_amount + expected_tax
                
                tax_correct = (
                    abs(pricing["tax_amount"] - expected_tax) < 0.01 and
                    abs(pricing["cgst"] - expected_cgst) < 0.01 and
                    abs(pricing["sgst"] - expected_sgst) < 0.01 and
                    abs(pricing["total_amount"] - expected_total) < 0.01
                )
                
                log_test("Price Calculation - Gujarat Tax", tax_correct, 
                         "Gujarat tax calculation (CGST + SGST) is correct" if tax_correct else 
                         f"Tax calculation incorrect. Expected tax: {expected_tax}, got: {pricing['tax_amount']}")
            else:
                log_test("Price Calculation - Gujarat Tax Structure", False, "Missing CGST/SGST in response")
        else:
            log_test("Price Calculation - Response Structure", False, "Response missing required fields")
    
    # Test 2: Valid calculation for other state (IGST)
    response = requests.post(f"{API_BASE_URL}/calculate-price?barcode_type=code128&quantity=50&state=Maharashtra")
    
    if response.status_code != 200:
        log_test("Price Calculation - Valid (Other State)", False, f"Expected status code 200, got {response.status_code}")
    else:
        data = response.json()
        # Check tax calculation for other state (IGST)
        pricing = data["pricing"]
        if "igst" in pricing and "total_amount" in pricing:
            # Verify tax calculation
            base_amount = data["unit_price"] * data["quantity"]
            expected_tax = base_amount * 0.18
            expected_total = base_amount + expected_tax
            
            tax_correct = (
                abs(pricing["tax_amount"] - expected_tax) < 0.01 and
                abs(pricing["igst"] - expected_tax) < 0.01 and
                abs(pricing["total_amount"] - expected_total) < 0.01
            )
            
            log_test("Price Calculation - IGST Tax", tax_correct, 
                     "IGST tax calculation is correct" if tax_correct else 
                     f"Tax calculation incorrect. Expected tax: {expected_tax}, got: {pricing['tax_amount']}")
        else:
            log_test("Price Calculation - IGST Tax Structure", False, "Missing IGST in response")
    
    # Test 3: Invalid barcode type
    response = requests.post(f"{API_BASE_URL}/calculate-price?barcode_type=invalid_type&quantity=10&state=Gujarat")
    
    if response.status_code == 400:
        log_test("Price Calculation - Invalid Barcode Type", True, "Correctly rejected invalid barcode type")
    else:
        log_test("Price Calculation - Invalid Barcode Type", False, 
                 f"Expected status code 400, got {response.status_code}")
    
    # Test 4: Zero quantity
    response = requests.post(f"{API_BASE_URL}/calculate-price?barcode_type=qr_code&quantity=0&state=Gujarat")
    
    if response.status_code == 400:
        log_test("Price Calculation - Zero Quantity", True, "Correctly rejected zero quantity")
    else:
        log_test("Price Calculation - Zero Quantity", False, 
                 f"Expected status code 400, got {response.status_code}")
    
    # Test 5: Negative quantity
    response = requests.post(f"{API_BASE_URL}/calculate-price?barcode_type=qr_code&quantity=-10&state=Gujarat")
    
    if response.status_code == 400:
        log_test("Price Calculation - Negative Quantity", True, "Correctly rejected negative quantity")
    else:
        log_test("Price Calculation - Negative Quantity", False, 
                 f"Expected status code 400, got {response.status_code}")

def test_order_creation_api():
    """Test the order creation API"""
    print("\n=== Testing Order Creation API ===")
    
    # Test 1: Valid order creation with Gujarat state
    customer_data = {
        "name": "Rajesh",
        "surname": "Patel",
        "organization": "ABC Technologies",
        "country": "India",
        "address": "123 Main Street, Ahmedabad",
        "phone": "9876543210",
        "email": "rajesh.patel@example.com",
        "gst_number": "24ABCDE1234F1Z5",
        "state": "Gujarat"
    }
    
    order_data = {
        "customer_details": customer_data,
        "barcode_type": "qr_code",
        "quantity": 50
    }
    
    response = requests.post(f"{API_BASE_URL}/create-order", json=order_data)
    
    if response.status_code != 200:
        log_test("Order Creation - Valid (Gujarat)", False, f"Expected status code 200, got {response.status_code}")
        return None
    else:
        data = response.json()
        # Check response structure
        if "order_id" in data and "order" in data and "tax_details" in data:
            # Verify tax calculation
            order = data["order"]
            tax_details = data["tax_details"]
            
            base_amount = order["total_amount"]
            expected_tax = base_amount * 0.18
            expected_total = base_amount + expected_tax
            
            tax_correct = (
                abs(order["tax_amount"] - expected_tax) < 0.01 and
                abs(order["final_amount"] - expected_total) < 0.01 and
                "cgst" in tax_details and "sgst" in tax_details
            )
            
            log_test("Order Creation - Gujarat Tax", tax_correct, 
                     "Gujarat tax calculation in order is correct" if tax_correct else 
                     "Tax calculation in order is incorrect")
            
            # Return the order ID for further testing
            return data["order_id"]
        else:
            log_test("Order Creation - Response Structure", False, "Response missing required fields")
            return None
    
    # Test 2: Valid order creation with other state
    customer_data = {
        "name": "Amit",
        "surname": "Sharma",
        "organization": "XYZ Solutions",
        "country": "India",
        "address": "456 Park Avenue, Mumbai",
        "phone": "8765432109",
        "email": "amit.sharma@example.com",
        "gst_number": "27FGHIJ5678K2Z3",
        "state": "Maharashtra"
    }
    
    order_data = {
        "customer_details": customer_data,
        "barcode_type": "code128",
        "quantity": 30
    }
    
    response = requests.post(f"{API_BASE_URL}/create-order", json=order_data)
    
    if response.status_code != 200:
        log_test("Order Creation - Valid (Other State)", False, f"Expected status code 200, got {response.status_code}")
    else:
        data = response.json()
        # Verify tax calculation
        order = data["order"]
        tax_details = data["tax_details"]
        
        base_amount = order["total_amount"]
        expected_tax = base_amount * 0.18
        expected_total = base_amount + expected_tax
        
        tax_correct = (
            abs(order["tax_amount"] - expected_tax) < 0.01 and
            abs(order["final_amount"] - expected_total) < 0.01 and
            "igst" in tax_details
        )
        
        log_test("Order Creation - IGST Tax", tax_correct, 
                 "IGST tax calculation in order is correct" if tax_correct else 
                 "Tax calculation in order is incorrect")
    
    # Test 3: Invalid barcode type
    customer_data = {
        "name": "Test",
        "surname": "User",
        "organization": "Test Org",
        "country": "India",
        "address": "Test Address",
        "phone": "1234567890",
        "email": "test@example.com",
        "state": "Gujarat"
    }
    
    order_data = {
        "customer_details": customer_data,
        "barcode_type": "invalid_type",
        "quantity": 10
    }
    
    response = requests.post(f"{API_BASE_URL}/create-order", json=order_data)
    
    if response.status_code == 400:
        log_test("Order Creation - Invalid Barcode Type", True, "Correctly rejected invalid barcode type")
    else:
        log_test("Order Creation - Invalid Barcode Type", False, 
                 f"Expected status code 400, got {response.status_code}")
    
    # Test 4: Missing required fields
    incomplete_order = {
        "barcode_type": "qr_code",
        "quantity": 10
    }
    
    response = requests.post(f"{API_BASE_URL}/create-order", json=incomplete_order)
    
    if response.status_code != 200:
        log_test("Order Creation - Missing Fields", True, "Correctly rejected order with missing fields")
    else:
        log_test("Order Creation - Missing Fields", False, "Accepted order with missing customer details")

def test_order_retrieval_api(order_id):
    """Test the order retrieval API"""
    print("\n=== Testing Order Retrieval API ===")
    
    if not order_id:
        log_test("Order Retrieval", False, "No order ID available for testing")
        return
    
    # Test 1: Valid order retrieval
    response = requests.get(f"{API_BASE_URL}/order/{order_id}")
    
    if response.status_code != 200:
        log_test("Order Retrieval - Valid", False, f"Expected status code 200, got {response.status_code}")
    else:
        data = response.json()
        # Check if the retrieved order matches the created order
        if data["id"] == order_id:
            log_test("Order Retrieval - Valid", True, "Successfully retrieved order")
        else:
            log_test("Order Retrieval - Valid", False, "Retrieved order ID doesn't match")
    
    # Test 2: Invalid order ID
    invalid_id = str(uuid.uuid4())
    response = requests.get(f"{API_BASE_URL}/order/{invalid_id}")
    
    if response.status_code == 404:
        log_test("Order Retrieval - Invalid ID", True, "Correctly returned 404 for invalid order ID")
    else:
        log_test("Order Retrieval - Invalid ID", False, 
                 f"Expected status code 404, got {response.status_code}")

def test_order_processing_api(order_id):
    """Test the order processing API"""
    print("\n=== Testing Order Processing API ===")
    
    if not order_id:
        log_test("Order Processing", False, "No order ID available for testing")
        return
    
    # Test order processing and zip file creation
    response = requests.post(f"{API_BASE_URL}/process-order/{order_id}", stream=True)
    
    if response.status_code != 200:
        log_test("Order Processing - Valid", False, f"Expected status code 200, got {response.status_code}")
        return
    
    # Check if the response is a zip file
    content_type = response.headers.get('Content-Type')
    if content_type != 'application/zip':
        log_test("Order Processing - Content Type", False, f"Expected application/zip, got {content_type}")
        return
    
    # Save the zip file
    zip_data = io.BytesIO(response.content)
    
    # Check if it's a valid zip file
    try:
        with zipfile.ZipFile(zip_data) as zip_file:
            file_list = zip_file.namelist()
            
            # Check for Excel file
            if "barcode_data.xlsx" not in file_list:
                log_test("Order Processing - Excel File", False, "Excel file not found in zip")
            else:
                log_test("Order Processing - Excel File", True, "Excel file found in zip")
            
            # Check for barcode images
            barcode_files = [f for f in file_list if f.startswith("barcodes/")]
            if not barcode_files:
                log_test("Order Processing - Barcode Images", False, "No barcode images found in zip")
            else:
                log_test("Order Processing - Barcode Images", True, f"Found {len(barcode_files)} barcode images")
            
            # Check for invoice
            if "invoice.json" not in file_list:
                log_test("Order Processing - Invoice", False, "Invoice file not found in zip")
            else:
                # Read and validate invoice
                invoice_data = json.loads(zip_file.read("invoice.json"))
                if "order_id" in invoice_data and invoice_data["order_id"] == order_id:
                    log_test("Order Processing - Invoice", True, "Invoice contains correct order ID")
                else:
                    log_test("Order Processing - Invoice", False, "Invoice has incorrect or missing order ID")
    
    except zipfile.BadZipFile:
        log_test("Order Processing - Zip File", False, "Response is not a valid zip file")
        return
    
    # Check if order status was updated to completed
    response = requests.get(f"{API_BASE_URL}/order/{order_id}")
    if response.status_code == 200:
        order_data = response.json()
        if order_data["order_status"] == "completed":
            log_test("Order Processing - Status Update", True, "Order status updated to completed")
        else:
            log_test("Order Processing - Status Update", False, 
                     f"Order status not updated, current status: {order_data['order_status']}")
    else:
        log_test("Order Processing - Status Check", False, "Failed to check order status after processing")

def test_orders_listing_api():
    """Test the orders listing API"""
    print("\n=== Testing Orders Listing API ===")
    
    response = requests.get(f"{API_BASE_URL}/orders")
    
    if response.status_code != 200:
        log_test("Orders Listing", False, f"Expected status code 200, got {response.status_code}")
        return
    
    data = response.json()
    if "orders" not in data:
        log_test("Orders Listing - Structure", False, "Response missing 'orders' key")
        return
    
    # Check if orders are returned as a list
    if not isinstance(data["orders"], list):
        log_test("Orders Listing - Type", False, "Orders should be a list")
        return
    
    log_test("Orders Listing", True, f"Successfully retrieved {len(data['orders'])} orders")

def print_summary():
    """Print test summary"""
    print("\n=== TEST SUMMARY ===")
    print(f"Total tests: {test_results['passed'] + test_results['failed']}")
    print(f"Passed: {test_results['passed']}")
    print(f"Failed: {test_results['failed']}")
    
    if test_results['failed'] > 0:
        print("\nFailed tests:")
        for test in test_results['tests']:
            if not test['passed']:
                print(f"- {test['name']}: {test['message']}")

def main():
    """Main test function"""
    print("Starting backend API tests...")
    
    # Test barcode types API
    test_barcode_types_api()
    
    # Test price calculation API
    test_price_calculation_api()
    
    # Test order creation API and get an order ID for further tests
    order_id = test_order_creation_api()
    
    # Test order retrieval API
    test_order_retrieval_api(order_id)
    
    # Test order processing API
    test_order_processing_api(order_id)
    
    # Test orders listing API
    test_orders_listing_api()
    
    # Print summary
    print_summary()
    
    # Return exit code based on test results
    return 1 if test_results['failed'] > 0 else 0

if __name__ == "__main__":
    sys.exit(main())