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

  // Barcode type icons and descriptions
  const getBarcodeTypeInfo = (type) => {
    const typeInfo = {
      qr_code: {
        icon: "📱",
        description: "Quick Response codes for digital content",
        features: ["Mobile-friendly", "High capacity", "Error correction"]
      },
      code128: {
        icon: "📊",
        description: "Linear barcode for alphanumeric data",
        features: ["High density", "Variable length", "Widely supported"]
      },
      ean13: {
        icon: "🛍️",
        description: "European Article Number for retail",
        features: ["Retail standard", "13 digits", "Global recognition"]
      },
      upc: {
        icon: "🏪",
        description: "Universal Product Code for products",
        features: ["US/Canada standard", "12 digits", "Point of sale"]
      },
      code39: {
        icon: "🏭",
        description: "Code 39 for industrial applications",
        features: ["Alphanumeric", "Self-checking", "Industrial use"]
      },
      datamatrix: {
        icon: "🔲",
        description: "2D matrix code for small items",
        features: ["Compact size", "High reliability", "Small parts marking"]
      }
    };
    return typeInfo[type] || { icon: "📋", description: "Professional barcode", features: [] };
  };

  // Step 1: Barcode Type Selection
  const renderStep1 = () => (
    <div className="step-container">
      <div className="step-header">
        <h2 className="step-title">Choose Your Barcode Type</h2>
        <p className="step-subtitle">Select the perfect barcode format for your needs</p>
      </div>
      
      <div className="barcode-grid">
        {Object.entries(barcodeTypes).map(([key, type]) => {
          const typeInfo = getBarcodeTypeInfo(key);
          return (
            <div
              key={key}
              className={`barcode-card ${formData.barcodeType === key ? 'selected' : ''}`}
              onClick={() => handleInputChange('barcodeType', key)}
            >
              <div className="barcode-card-header">
                <span className="barcode-icon">{typeInfo.icon}</span>
                <h3 className="barcode-title">{type.name}</h3>
              </div>
              
              <div className="barcode-price">
                <span className="price-currency">$</span>
                <span className="price-amount">{type.price}</span>
                <span className="price-unit">per code</span>
              </div>
              
              <p className="barcode-description">{typeInfo.description}</p>
              
              <div className="barcode-features">
                {typeInfo.features.map((feature, idx) => (
                  <span key={idx} className="feature-tag">{feature}</span>
                ))}
              </div>
              
              <div className="barcode-card-footer">
                <button className="select-btn">
                  {formData.barcodeType === key ? 'Selected ✓' : 'Select'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="step-actions">
        <button
          onClick={() => handleStepChange(2)}
          disabled={!formData.barcodeType}
          className="btn-primary btn-next"
        >
          Continue to Quantity
          <span className="btn-arrow">→</span>
        </button>
      </div>
    </div>
  );

  // Step 2: Quantity Selection
  const renderStep2 = () => (
    <div className="step-container">
      <div className="step-header">
        <h2 className="step-title">How Many Barcodes?</h2>
        <p className="step-subtitle">Choose your quantity and see live pricing</p>
      </div>
      
      <div className="quantity-section">
        <div className="selected-type-info">
          <span className="selected-icon">{getBarcodeTypeInfo(formData.barcodeType).icon}</span>
          <div>
            <h3 className="selected-type">{barcodeTypes[formData.barcodeType]?.name}</h3>
            <p className="selected-description">{getBarcodeTypeInfo(formData.barcodeType).description}</p>
          </div>
        </div>
        
        <div className="quantity-input-container">
          <label className="quantity-label">Quantity</label>
          <div className="quantity-controls">
            <button 
              className="quantity-btn"
              onClick={() => {
                const newQuantity = Math.max(1, formData.quantity - 1);
                handleInputChange('quantity', newQuantity);
                if (newQuantity > 0) calculatePrice();
              }}
            >
              −
            </button>
            <input
              type="number"
              min="1"
              max="10000"
              value={formData.quantity}
              onChange={(e) => {
                const quantity = parseInt(e.target.value) || 1;
                handleInputChange('quantity', quantity);
                if (quantity > 0) calculatePrice();
              }}
              className="quantity-input"
            />
            <button 
              className="quantity-btn"
              onClick={() => {
                const newQuantity = Math.min(10000, formData.quantity + 1);
                handleInputChange('quantity', newQuantity);
                calculatePrice();
              }}
            >
              +
            </button>
          </div>
          <p className="quantity-note">Min: 1 • Max: 10,000</p>
        </div>
        
        {pricing && (
          <div className="pricing-breakdown">
            <h3 className="pricing-title">Price Breakdown</h3>
            <div className="pricing-details">
              <div className="pricing-row">
                <span>Unit Price:</span>
                <span>${barcodeTypes[formData.barcodeType]?.price}</span>
              </div>
              <div className="pricing-row">
                <span>Quantity:</span>
                <span>{formData.quantity}</span>
              </div>
              <div className="pricing-row">
                <span>Subtotal:</span>
                <span>${pricing.base_amount.toFixed(2)}</span>
              </div>
              <div className="pricing-row">
                <span>Tax ({pricing.igst ? 'IGST' : 'CGST + SGST'}):</span>
                <span>${pricing.tax_amount.toFixed(2)}</span>
              </div>
              <div className="pricing-row total">
                <span>Total Amount:</span>
                <span>${pricing.total_amount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="step-actions">
        <button
          onClick={() => handleStepChange(1)}
          className="btn-secondary btn-back"
        >
          ← Back
        </button>
        <button
          onClick={() => handleStepChange(3)}
          disabled={!formData.quantity || formData.quantity <= 0}
          className="btn-primary btn-next"
        >
          Continue to Details
          <span className="btn-arrow">→</span>
        </button>
      </div>
    </div>
  );

  // Step 3: Customer Details Form
  const renderStep3 = () => (
    <div className="step-container">
      <div className="step-header">
        <h2 className="step-title">Your Information</h2>
        <p className="step-subtitle">We need these details for your order and invoice</p>
      </div>
      
      <form className="customer-form">
        <div className="form-section">
          <h3 className="form-section-title">👤 Personal Information</h3>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">First Name *</label>
              <input
                type="text"
                value={formData.customerDetails.name}
                onChange={(e) => handleInputChange('customerDetails.name', e.target.value)}
                className="form-input"
                placeholder="Enter your first name"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Last Name *</label>
              <input
                type="text"
                value={formData.customerDetails.surname}
                onChange={(e) => handleInputChange('customerDetails.surname', e.target.value)}
                className="form-input"
                placeholder="Enter your last name"
                required
              />
            </div>
          </div>
          
          <div className="form-group">
            <label className="form-label">Email Address *</label>
            <input
              type="email"
              value={formData.customerDetails.email}
              onChange={(e) => handleInputChange('customerDetails.email', e.target.value)}
              className="form-input"
              placeholder="your@email.com"
              required
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Phone Number (WhatsApp) *</label>
            <input
              type="tel"
              value={formData.customerDetails.phone}
              onChange={(e) => handleInputChange('customerDetails.phone', e.target.value)}
              className="form-input"
              placeholder="+1 (555) 123-4567"
              required
            />
          </div>
        </div>
        
        <div className="form-section">
          <h3 className="form-section-title">🏢 Business Information</h3>
          <div className="form-group">
            <label className="form-label">Organization *</label>
            <input
              type="text"
              value={formData.customerDetails.organization}
              onChange={(e) => handleInputChange('customerDetails.organization', e.target.value)}
              className="form-input"
              placeholder="Your company name"
              required
            />
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Country *</label>
              <input
                type="text"
                value={formData.customerDetails.country}
                onChange={(e) => handleInputChange('customerDetails.country', e.target.value)}
                className="form-input"
                placeholder="e.g., United States"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">State/Province</label>
              <input
                type="text"
                value={formData.customerDetails.state}
                onChange={(e) => {
                  handleInputChange('customerDetails.state', e.target.value);
                  calculatePrice();
                }}
                className="form-input"
                placeholder="e.g., Gujarat (for special tax rate)"
              />
            </div>
          </div>
          
          <div className="form-group">
            <label className="form-label">Business Address *</label>
            <textarea
              value={formData.customerDetails.address}
              onChange={(e) => handleInputChange('customerDetails.address', e.target.value)}
              className="form-textarea"
              rows="3"
              placeholder="Enter your complete business address"
              required
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">GST Number (Optional)</label>
            <input
              type="text"
              value={formData.customerDetails.gst_number}
              onChange={(e) => handleInputChange('customerDetails.gst_number', e.target.value)}
              className="form-input"
              placeholder="e.g., 24ABCDE1234F1Z5"
            />
            <p className="form-help">Required for businesses in India</p>
          </div>
        </div>
      </form>
      
      <div className="step-actions">
        <button
          onClick={() => handleStepChange(2)}
          className="btn-secondary btn-back"
        >
          ← Back
        </button>
        <button
          onClick={createOrder}
          disabled={loading || !formData.customerDetails.name || !formData.customerDetails.email}
          className="btn-primary btn-next"
        >
          {loading ? (
            <>
              <span className="loading-spinner"></span>
              Creating Order...
            </>
          ) : (
            <>
              Create Order
              <span className="btn-arrow">→</span>
            </>
          )}
        </button>
      </div>
    </div>
  );

  // Step 4: Order Summary & Payment
  const renderStep4 = () => (
    <div className="step-container">
      <div className="step-header">
        <h2 className="step-title">Order Summary</h2>
        <p className="step-subtitle">Review your order and generate barcodes</p>
      </div>
      
      {order && (
        <div className="order-summary">
          <div className="order-header">
            <div className="order-id">
              <span className="order-label">Order ID:</span>
              <span className="order-value">{order.order_id}</span>
            </div>
            <div className="order-status">
              <span className="status-badge">Ready to Generate</span>
            </div>
          </div>
          
          <div className="order-details-grid">
            <div className="order-card">
              <h3 className="card-title">📋 Order Details</h3>
              <div className="order-item">
                <span className="item-icon">{getBarcodeTypeInfo(formData.barcodeType).icon}</span>
                <div className="item-details">
                  <h4>{barcodeTypes[formData.barcodeType]?.name}</h4>
                  <p>Quantity: {formData.quantity} codes</p>
                </div>
                <div className="item-price">
                  ${order.order.total_amount.toFixed(2)}
                </div>
              </div>
            </div>
            
            <div className="order-card">
              <h3 className="card-title">👤 Customer Information</h3>
              <div className="customer-info">
                <p><strong>{formData.customerDetails.name} {formData.customerDetails.surname}</strong></p>
                <p>{formData.customerDetails.organization}</p>
                <p>{formData.customerDetails.email}</p>
                <p>{formData.customerDetails.phone}</p>
              </div>
            </div>
            
            <div className="order-card">
              <h3 className="card-title">💰 Payment Breakdown</h3>
              <div className="payment-details">
                <div className="payment-row">
                  <span>Subtotal:</span>
                  <span>${order.order.total_amount.toFixed(2)}</span>
                </div>
                <div className="payment-row">
                  <span>Tax:</span>
                  <span>${order.order.tax_amount.toFixed(2)}</span>
                </div>
                <div className="payment-row total">
                  <span>Total:</span>
                  <span>${order.order.final_amount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="payment-section">
            <div className="payment-notice">
              <div className="notice-icon">🔔</div>
              <div className="notice-content">
                <h4>Payment Integration Coming Soon!</h4>
                <p>For now, you can generate and download your barcodes directly. Payment integration with Razorpay and PayPal will be added once API keys are provided.</p>
              </div>
            </div>
            
            <button
              onClick={processOrder}
              disabled={loading}
              className="btn-generate"
            >
              {loading ? (
                <>
                  <span className="loading-spinner"></span>
                  Generating Barcodes...
                </>
              ) : (
                <>
                  <span className="generate-icon">🎯</span>
                  Generate & Download Barcodes
                </>
              )}
            </button>
            
            <div className="download-info">
              <h4>📦 What you'll receive:</h4>
              <ul>
                <li>✅ Excel file with all barcode data</li>
                <li>✅ Individual barcode images (PNG format)</li>
                <li>✅ Invoice with order details</li>
                <li>✅ Everything packaged in a convenient ZIP file</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Progress indicator
  const renderProgressIndicator = () => (
    <div className="progress-container">
      <div className="progress-bar">
        <div 
          className="progress-fill" 
          style={{ width: `${(currentStep / 4) * 100}%` }}
        ></div>
      </div>
      <div className="progress-steps">
        {[
          { step: 1, label: "Type", icon: "🎯" },
          { step: 2, label: "Quantity", icon: "📊" },
          { step: 3, label: "Details", icon: "📝" },
          { step: 4, label: "Generate", icon: "🚀" }
        ].map(({ step, label, icon }) => (
          <div key={step} className="progress-step-container">
            <div
              className={`progress-step ${currentStep >= step ? 'active' : ''} ${currentStep === step ? 'current' : ''}`}
            >
              <span className="step-icon">{icon}</span>
              <span className="step-number">{step}</span>
            </div>
            <span className="step-label">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="header-content">
          <div className="logo-section">
            <h1 className="app-title">
              <span className="logo-icon">📊</span>
              BarcodeGen Pro
            </h1>
            <p className="app-tagline">Professional barcode generation made simple</p>
          </div>
          <div className="header-stats">
            <div className="stat-item">
              <span className="stat-number">6</span>
              <span className="stat-label">Barcode Types</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">10K+</span>
              <span className="stat-label">Max Quantity</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">⚡</span>
              <span className="stat-label">Instant Download</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        <div className="container">
          {renderProgressIndicator()}
          
          <div className="step-content">
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
            {currentStep === 4 && renderStep4()}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <div className="footer-content">
          <p>© 2024 BarcodeGen Pro. Professional barcode generation service.</p>
          <div className="footer-links">
            <span>Secure</span>
            <span>•</span>
            <span>Reliable</span>
            <span>•</span>
            <span>Fast</span>
          </div>
        </div>
      </footer>
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