import React, { useState, useEffect } from "react";
import "./App.css";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Multi-step form component
const BarcodeGeneratorApp = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [barcodeTypes, setBarcodeTypes] = useState({});
  const [formData, setFormData] = useState({
    barcodeType: '',
    quantity: 1,
    customerDetails: {
      name: '',
      surname: '',
      organization: '',
      country: '',
      address: '',
      phone: '',
      email: '',
      gst_number: '',
      state: ''
    }
  });
  const [pricing, setPricing] = useState(null);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchBarcodeTypes();
  }, []);

  const fetchBarcodeTypes = async () => {
    try {
      const response = await axios.get(`${API}/barcode-types`);
      setBarcodeTypes(response.data.barcode_types);
    } catch (error) {
      console.error('Error fetching barcode types:', error);
    }
  };

  const calculatePrice = async () => {
    if (!formData.barcodeType || !formData.quantity) return;
    
    try {
      const response = await axios.post(`${API}/calculate-price`, null, {
        params: {
          barcode_type: formData.barcodeType,
          quantity: formData.quantity,
          state: formData.customerDetails.state || 'other'
        }
      });
      setPricing(response.data.pricing);
    } catch (error) {
      console.error('Error calculating price:', error);
    }
  };

  const handleStepChange = (step) => {
    setCurrentStep(step);
  };

  const handleInputChange = (field, value) => {
    if (field.startsWith('customerDetails.')) {
      const customerField = field.split('.')[1];
      setFormData(prev => ({
        ...prev,
        customerDetails: {
          ...prev.customerDetails,
          [customerField]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const createOrder = async () => {
    setLoading(true);
    try {
      const orderData = {
        barcode_type: formData.barcodeType,
        quantity: formData.quantity,
        customer_details: {
          ...formData.customerDetails,
          id: undefined // Let backend generate ID
        }
      };

      const response = await axios.post(`${API}/create-order`, orderData);
      setOrder(response.data);
      setCurrentStep(4);
    } catch (error) {
      console.error('Error creating order:', error);
      alert('Failed to create order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const processOrder = async () => {
    if (!order) return;
    
    setLoading(true);
    try {
      const response = await axios.post(`${API}/process-order/${order.order_id}`, {}, {
        responseType: 'blob'
      });
      
      // Create download link
      const blob = new Blob([response.data], { type: 'application/zip' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `barcodes_${order.order_id}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      alert('Barcodes generated successfully! Download started.');
    } catch (error) {
      console.error('Error processing order:', error);
      alert('Failed to generate barcodes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Barcode Type Selection
  const renderStep1 = () => (
    <div className="step-container">
      <h2 className="text-3xl font-bold text-gray-800 mb-8">Select Barcode Type</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(barcodeTypes).map(([key, type]) => (
          <div
            key={key}
            className={`p-6 border-2 rounded-lg cursor-pointer transition-all duration-300 hover:shadow-lg ${
              formData.barcodeType === key
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-blue-300'
            }`}
            onClick={() => handleInputChange('barcodeType', key)}
          >
            <h3 className="text-xl font-semibold text-gray-800 mb-2">{type.name}</h3>
            <p className="text-2xl font-bold text-blue-600">${type.price}</p>
            <p className="text-sm text-gray-600 mt-2">per barcode</p>
          </div>
        ))}
      </div>
      <div className="mt-8 flex justify-center">
        <button
          onClick={() => handleStepChange(2)}
          disabled={!formData.barcodeType}
          className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors duration-300"
        >
          Next: Select Quantity
        </button>
      </div>
    </div>
  );

  // Step 2: Quantity Selection
  const renderStep2 = () => (
    <div className="step-container">
      <h2 className="text-3xl font-bold text-gray-800 mb-8">Select Quantity</h2>
      <div className="max-w-md mx-auto">
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Selected Type: {barcodeTypes[formData.barcodeType]?.name}
          </label>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Quantity
          </label>
          <input
            type="number"
            min="1"
            max="10000"
            value={formData.quantity}
            onChange={(e) => {
              const quantity = parseInt(e.target.value) || 1;
              handleInputChange('quantity', quantity);
              if (quantity > 0) {
                calculatePrice();
              }
            }}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-2xl font-semibold"
          />
        </div>
        
        {pricing && (
          <div className="bg-gray-50 p-6 rounded-lg mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Price Breakdown</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Base Amount:</span>
                <span>${pricing.base_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax ({pricing.igst ? 'IGST' : 'CGST + SGST'}):</span>
                <span>${pricing.tax_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Total Amount:</span>
                <span>${pricing.total_amount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="flex justify-center space-x-4">
        <button
          onClick={() => handleStepChange(1)}
          className="px-6 py-3 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600 transition-colors duration-300"
        >
          Back
        </button>
        <button
          onClick={() => handleStepChange(3)}
          disabled={!formData.quantity || formData.quantity <= 0}
          className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors duration-300"
        >
          Next: Customer Details
        </button>
      </div>
    </div>
  );

  // Step 3: Customer Details Form
  const renderStep3 = () => (
    <div className="step-container">
      <h2 className="text-3xl font-bold text-gray-800 mb-8">Customer Details</h2>
      <div className="max-w-2xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Name *
            </label>
            <input
              type="text"
              value={formData.customerDetails.name}
              onChange={(e) => handleInputChange('customerDetails.name', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Surname *
            </label>
            <input
              type="text"
              value={formData.customerDetails.surname}
              onChange={(e) => handleInputChange('customerDetails.surname', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Organization *
            </label>
            <input
              type="text"
              value={formData.customerDetails.organization}
              onChange={(e) => handleInputChange('customerDetails.organization', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Country *
            </label>
            <input
              type="text"
              value={formData.customerDetails.country}
              onChange={(e) => handleInputChange('customerDetails.country', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              State
            </label>
            <input
              type="text"
              value={formData.customerDetails.state}
              onChange={(e) => {
                handleInputChange('customerDetails.state', e.target.value);
                calculatePrice(); // Recalculate price when state changes
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter state (Gujarat for special tax rate)"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone (WhatsApp) *
            </label>
            <input
              type="tel"
              value={formData.customerDetails.phone}
              onChange={(e) => handleInputChange('customerDetails.phone', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email *
            </label>
            <input
              type="email"
              value={formData.customerDetails.email}
              onChange={(e) => handleInputChange('customerDetails.email', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Address *
            </label>
            <textarea
              value={formData.customerDetails.address}
              onChange={(e) => handleInputChange('customerDetails.address', e.target.value)}
              rows="3"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              GST Number (if applicable)
            </label>
            <input
              type="text"
              value={formData.customerDetails.gst_number}
              onChange={(e) => handleInputChange('customerDetails.gst_number', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter GST number if registered"
            />
          </div>
        </div>
        
        <div className="flex justify-center space-x-4 mt-8">
          <button
            onClick={() => handleStepChange(2)}
            className="px-6 py-3 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600 transition-colors duration-300"
          >
            Back
          </button>
          <button
            onClick={createOrder}
            disabled={loading || !formData.customerDetails.name || !formData.customerDetails.email}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors duration-300"
          >
            {loading ? 'Creating Order...' : 'Create Order'}
          </button>
        </div>
      </div>
    </div>
  );

  // Step 4: Order Summary & Payment
  const renderStep4 = () => (
    <div className="step-container">
      <h2 className="text-3xl font-bold text-gray-800 mb-8">Order Summary</h2>
      {order && (
        <div className="max-w-2xl mx-auto">
          <div className="bg-white p-6 rounded-lg shadow-lg border">
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Order Details</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Order ID:</span>
                  <span className="font-mono text-sm">{order.order_id}</span>
                </div>
                <div className="flex justify-between">
                  <span>Barcode Type:</span>
                  <span>{barcodeTypes[formData.barcodeType]?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Quantity:</span>
                  <span>{formData.quantity}</span>
                </div>
                <div className="flex justify-between">
                  <span>Customer:</span>
                  <span>{formData.customerDetails.name} {formData.customerDetails.surname}</span>
                </div>
              </div>
            </div>
            
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Payment Details</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Base Amount:</span>
                  <span>${order.order.total_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax Amount:</span>
                  <span>${order.order.tax_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total Amount:</span>
                  <span>${order.order.final_amount.toFixed(2)}</span>
                </div>
              </div>
            </div>
            
            <div className="text-center">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <p className="text-yellow-800">
                  <strong>Payment Integration Coming Soon!</strong><br/>
                  For now, you can generate barcodes directly.
                </p>
              </div>
              
              <button
                onClick={processOrder}
                disabled={loading}
                className="w-full py-4 bg-green-600 text-white rounded-lg font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed hover:bg-green-700 transition-colors duration-300 text-lg"
              >
                {loading ? 'Generating Barcodes...' : 'Generate & Download Barcodes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Progress indicator
  const renderProgressIndicator = () => (
    <div className="flex justify-center mb-8">
      <div className="flex items-center space-x-4">
        {[1, 2, 3, 4].map((step) => (
          <div key={step} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                currentStep >= step
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              {step}
            </div>
            {step < 4 && (
              <div
                className={`w-16 h-1 ${
                  currentStep > step ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Barcode Generator Pro
          </h1>
          <p className="text-lg text-gray-600">
            Generate professional barcodes on demand
          </p>
        </div>
        
        {renderProgressIndicator()}
        
        <div className="max-w-6xl mx-auto">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
        </div>
      </div>
    </div>
  );
};

function App() {
  return (
    <div className="App">
      <BarcodeGeneratorApp />
    </div>
  );
}

export default App;