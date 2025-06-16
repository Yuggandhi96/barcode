import React, { useState, useEffect } from "react";
import "./App.css";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Professional Barcode Generator Application
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
          id: undefined
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

  // Professional barcode type configurations
  const getBarcodeTypeInfo = (type) => {
    const typeInfo = {
      qr_code: {
        title: "QR Code",
        description: "Two-dimensional matrix barcode optimized for quick reading and high data capacity",
        useCases: ["Digital content", "Mobile payments", "Contact information"],
        specifications: "ISO/IEC 18004 standard"
      },
      code128: {
        title: "Code 128",
        description: "High-density linear barcode supporting full ASCII character set",
        useCases: ["Supply chain", "Shipping labels", "Inventory management"],
        specifications: "Variable length, high density"
      },
      ean13: {
        title: "EAN-13",
        description: "European Article Number standard for retail product identification",
        useCases: ["Retail products", "Point of sale", "Inventory tracking"],
        specifications: "13-digit GTIN standard"
      },
      upc: {
        title: "UPC-A",
        description: "Universal Product Code standard for North American retail",
        useCases: ["Consumer products", "Retail scanning", "Product identification"],
        specifications: "12-digit GTIN-12 format"
      },
      code39: {
        title: "Code 39",
        description: "Alphanumeric linear barcode with built-in error checking",
        useCases: ["Industrial applications", "Healthcare", "Government tracking"],
        specifications: "Self-checking, alphanumeric"
      },
      datamatrix: {
        title: "Data Matrix",
        description: "Compact 2D barcode ideal for marking small components",
        useCases: ["Component marking", "Electronics", "Medical devices"],
        specifications: "High data density, error correction"
      }
    };
    return typeInfo[type] || { 
      title: "Standard Barcode", 
      description: "Professional barcode solution", 
      useCases: [], 
      specifications: ""
    };
  };

  // Step 1: Barcode Type Selection
  const renderStep1 = () => (
    <div className="glass-panel main-panel">
      <div className="panel-header">
        <h2 className="panel-title">Select Barcode Standard</h2>
        <p className="panel-subtitle">Choose the appropriate barcode format for your application requirements</p>
      </div>
      
      <div className="barcode-selection-grid">
        {Object.entries(barcodeTypes).map(([key, type]) => {
          const typeInfo = getBarcodeTypeInfo(key);
          return (
            <div
              key={key}
              className={`barcode-option-card ${formData.barcodeType === key ? 'selected' : ''}`}
              onClick={() => handleInputChange('barcodeType', key)}
            >
              <div className="card-header">
                <h3 className="card-title">{typeInfo.title}</h3>
                <div className="price-display">
                  <span className="currency">USD</span>
                  <span className="amount">{type.price.toFixed(2)}</span>
                  <span className="unit">per unit</span>
                </div>
              </div>
              
              <div className="card-content">
                <p className="description">{typeInfo.description}</p>
                
                <div className="specifications">
                  <div className="spec-item">
                    <span className="spec-label">Standard:</span>
                    <span className="spec-value">{typeInfo.specifications}</span>
                  </div>
                </div>
                
                <div className="use-cases">
                  <span className="use-cases-label">Applications:</span>
                  <div className="use-cases-list">
                    {typeInfo.useCases.map((useCase, idx) => (
                      <span key={idx} className="use-case-tag">{useCase}</span>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="card-footer">
                <div className="selection-indicator">
                  {formData.barcodeType === key ? 'Selected' : 'Select'}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="panel-actions">
        <button
          onClick={() => handleStepChange(2)}
          disabled={!formData.barcodeType}
          className="primary-button"
        >
          <span>Continue to Configuration</span>
          <svg className="button-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );

  // Step 2: Quantity Configuration
  const renderStep2 = () => (
    <div className="glass-panel main-panel">
      <div className="panel-header">
        <h2 className="panel-title">Configuration & Pricing</h2>
        <p className="panel-subtitle">Define quantity parameters and review cost analysis</p>
      </div>
      
      <div className="configuration-container">
        <div className="selected-standard-info">
          <div className="standard-details">
            <h3 className="standard-name">{getBarcodeTypeInfo(formData.barcodeType).title}</h3>
            <p className="standard-description">{getBarcodeTypeInfo(formData.barcodeType).description}</p>
            <span className="standard-spec">{getBarcodeTypeInfo(formData.barcodeType).specifications}</span>
          </div>
        </div>
        
        <div className="quantity-configuration">
          <div className="input-group">
            <label className="input-label">Quantity</label>
            <div className="quantity-controls">
              <button 
                type="button"
                className="quantity-button decrease"
                onClick={() => {
                  const newQuantity = Math.max(1, formData.quantity - 1);
                  handleInputChange('quantity', newQuantity);
                  if (newQuantity > 0) calculatePrice();
                }}
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
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
                type="button"
                className="quantity-button increase"
                onClick={() => {
                  const newQuantity = Math.min(10000, formData.quantity + 1);
                  handleInputChange('quantity', newQuantity);
                  calculatePrice();
                }}
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </button>
            </div>
            <span className="input-help">Minimum: 1 unit • Maximum: 10,000 units</span>
          </div>
        </div>
        
        {pricing && (
          <div className="pricing-analysis">
            <h3 className="analysis-title">Cost Analysis</h3>
            <div className="pricing-breakdown">
              <div className="breakdown-row">
                <span className="breakdown-label">Unit Price</span>
                <span className="breakdown-value">USD {barcodeTypes[formData.barcodeType]?.price.toFixed(2)}</span>
              </div>
              <div className="breakdown-row">
                <span className="breakdown-label">Quantity</span>
                <span className="breakdown-value">{formData.quantity.toLocaleString()} units</span>
              </div>
              <div className="breakdown-row">
                <span className="breakdown-label">Subtotal</span>
                <span className="breakdown-value">USD {pricing.base_amount.toFixed(2)}</span>
              </div>
              <div className="breakdown-row">
                <span className="breakdown-label">Tax ({pricing.igst ? 'IGST' : 'CGST + SGST'})</span>
                <span className="breakdown-value">USD {pricing.tax_amount.toFixed(2)}</span>
              </div>
              <div className="breakdown-row total-row">
                <span className="breakdown-label">Total Amount</span>
                <span className="breakdown-value">USD {pricing.total_amount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="panel-actions">
        <button onClick={() => handleStepChange(1)} className="secondary-button">
          <svg className="button-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span>Previous</span>
        </button>
        <button
          onClick={() => handleStepChange(3)}
          disabled={!formData.quantity || formData.quantity <= 0}
          className="primary-button"
        >
          <span>Continue to Information</span>
          <svg className="button-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );

  // Step 3: Customer Information
  const renderStep3 = () => (
    <div className="glass-panel main-panel">
      <div className="panel-header">
        <h2 className="panel-title">Customer Information</h2>
        <p className="panel-subtitle">Provide billing details and delivery information for order processing</p>
      </div>
      
      <form className="information-form">
        <div className="form-section">
          <h3 className="section-title">Personal Details</h3>
          <div className="form-grid">
            <div className="form-field">
              <label className="field-label">First Name *</label>
              <input
                type="text"
                value={formData.customerDetails.name}
                onChange={(e) => handleInputChange('customerDetails.name', e.target.value)}
                className="field-input"
                placeholder="Enter first name"
                required
              />
            </div>
            <div className="form-field">
              <label className="field-label">Last Name *</label>
              <input
                type="text"
                value={formData.customerDetails.surname}
                onChange={(e) => handleInputChange('customerDetails.surname', e.target.value)}
                className="field-input"
                placeholder="Enter last name"
                required
              />
            </div>
          </div>
          
          <div className="form-field">
            <label className="field-label">Email Address *</label>
            <input
              type="email"
              value={formData.customerDetails.email}
              onChange={(e) => handleInputChange('customerDetails.email', e.target.value)}
              className="field-input"
              placeholder="name@company.com"
              required
            />
          </div>
          
          <div className="form-field">
            <label className="field-label">Phone Number *</label>
            <input
              type="tel"
              value={formData.customerDetails.phone}
              onChange={(e) => handleInputChange('customerDetails.phone', e.target.value)}
              className="field-input"
              placeholder="+1 (555) 000-0000"
              required
            />
          </div>
        </div>
        
        <div className="form-section">
          <h3 className="section-title">Business Information</h3>
          <div className="form-field">
            <label className="field-label">Organization *</label>
            <input
              type="text"
              value={formData.customerDetails.organization}
              onChange={(e) => handleInputChange('customerDetails.organization', e.target.value)}
              className="field-input"
              placeholder="Company name"
              required
            />
          </div>
          
          <div className="form-grid">
            <div className="form-field">
              <label className="field-label">Country *</label>
              <input
                type="text"
                value={formData.customerDetails.country}
                onChange={(e) => handleInputChange('customerDetails.country', e.target.value)}
                className="field-input"
                placeholder="United States"
                required
              />
            </div>
            <div className="form-field">
              <label className="field-label">State/Province</label>
              <input
                type="text"
                value={formData.customerDetails.state}
                onChange={(e) => {
                  handleInputChange('customerDetails.state', e.target.value);
                  calculatePrice();
                }}
                className="field-input"
                placeholder="California"
              />
            </div>
          </div>
          
          <div className="form-field">
            <label className="field-label">Business Address *</label>
            <textarea
              value={formData.customerDetails.address}
              onChange={(e) => handleInputChange('customerDetails.address', e.target.value)}
              className="field-textarea"
              rows="3"
              placeholder="Complete business address including postal code"
              required
            />
          </div>
          
          <div className="form-field">
            <label className="field-label">Tax Registration Number</label>
            <input
              type="text"
              value={formData.customerDetails.gst_number}
              onChange={(e) => handleInputChange('customerDetails.gst_number', e.target.value)}
              className="field-input"
              placeholder="GST/VAT/TIN registration number"
            />
            <span className="field-help">Required for tax-exempt organizations or businesses</span>
          </div>
        </div>
      </form>
      
      <div className="panel-actions">
        <button onClick={() => handleStepChange(2)} className="secondary-button">
          <svg className="button-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span>Previous</span>
        </button>
        <button
          onClick={createOrder}
          disabled={loading || !formData.customerDetails.name || !formData.customerDetails.email}
          className="primary-button"
        >
          {loading ? (
            <>
              <div className="loading-indicator"></div>
              <span>Processing Order...</span>
            </>
          ) : (
            <>
              <span>Create Order</span>
              <svg className="button-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </>
          )}
        </button>
      </div>
    </div>
  );

  // Step 4: Order Confirmation & Generation
  const renderStep4 = () => (
    <div className="glass-panel main-panel">
      <div className="panel-header">
        <h2 className="panel-title">Order Confirmation</h2>
        <p className="panel-subtitle">Review order details and initiate barcode generation</p>
      </div>
      
      {order && (
        <div className="order-confirmation">
          <div className="order-summary-header">
            <div className="order-reference">
              <span className="reference-label">Order Reference</span>
              <span className="reference-value">{order.order_id}</span>
            </div>
            <div className="order-status-indicator">
              <span className="status-badge ready">Ready for Generation</span>
            </div>
          </div>
          
          <div className="order-details-grid">
            <div className="detail-card">
              <h3 className="card-title">Order Specification</h3>
              <div className="order-specification">
                <div className="spec-row">
                  <span className="spec-label">Barcode Standard</span>
                  <span className="spec-value">{getBarcodeTypeInfo(formData.barcodeType).title}</span>
                </div>
                <div className="spec-row">
                  <span className="spec-label">Quantity</span>
                  <span className="spec-value">{formData.quantity.toLocaleString()} units</span>
                </div>
                <div className="spec-row">
                  <span className="spec-label">Unit Price</span>
                  <span className="spec-value">USD {barcodeTypes[formData.barcodeType]?.price.toFixed(2)}</span>
                </div>
              </div>
            </div>
            
            <div className="detail-card">
              <h3 className="card-title">Customer Information</h3>
              <div className="customer-summary">
                <div className="customer-name">{formData.customerDetails.name} {formData.customerDetails.surname}</div>
                <div className="customer-organization">{formData.customerDetails.organization}</div>
                <div className="customer-contact">{formData.customerDetails.email}</div>
                <div className="customer-phone">{formData.customerDetails.phone}</div>
              </div>
            </div>
            
            <div className="detail-card">
              <h3 className="card-title">Financial Summary</h3>
              <div className="financial-breakdown">
                <div className="financial-row">
                  <span className="financial-label">Subtotal</span>
                  <span className="financial-value">USD {order.order.total_amount.toFixed(2)}</span>
                </div>
                <div className="financial-row">
                  <span className="financial-label">Tax</span>
                  <span className="financial-value">USD {order.order.tax_amount.toFixed(2)}</span>
                </div>
                <div className="financial-row total">
                  <span className="financial-label">Total Amount</span>
                  <span className="financial-value">USD {order.order.final_amount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="generation-section">
            <div className="payment-status-notice">
              <div className="notice-content">
                <h4 className="notice-title">Payment Integration Pending</h4>
                <p className="notice-description">
                  Payment gateway integration will be activated upon API key configuration. 
                  Currently operating in development mode for barcode generation testing.
                </p>
              </div>
            </div>
            
            <button
              onClick={processOrder}
              disabled={loading}
              className="generation-button"
            >
              {loading ? (
                <>
                  <div className="loading-indicator"></div>
                  <span>Generating Barcodes...</span>
                </>
              ) : (
                <>
                  <svg className="button-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Generate & Download Package</span>
                </>
              )}
            </button>
            
            <div className="deliverable-manifest">
              <h4 className="manifest-title">Package Contents</h4>
              <ul className="manifest-list">
                <li className="manifest-item">
                  <span className="item-icon">📊</span>
                  <span className="item-description">Excel spreadsheet with barcode data and metadata</span>
                </li>
                <li className="manifest-item">
                  <span className="item-icon">🖼️</span>
                  <span className="item-description">High-resolution barcode images (PNG format)</span>
                </li>
                <li className="manifest-item">
                  <span className="item-icon">📄</span>
                  <span className="item-description">Detailed invoice with order information</span>
                </li>
                <li className="manifest-item">
                  <span className="item-icon">📦</span>
                  <span className="item-description">Compressed archive for efficient delivery</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Professional progress indicator
  const renderProgressIndicator = () => (
    <div className="progress-tracker">
      <div className="progress-rail">
        <div 
          className="progress-indicator" 
          style={{ width: `${((currentStep - 1) / 3) * 100}%` }}
        ></div>
      </div>
      <div className="progress-steps">
        {[
          { step: 1, label: "Selection", description: "Barcode Standard" },
          { step: 2, label: "Configuration", description: "Quantity & Pricing" },
          { step: 3, label: "Information", description: "Customer Details" },
          { step: 4, label: "Generation", description: "Order Processing" }
        ].map(({ step, label, description }) => (
          <div key={step} className="progress-step-container">
            <div
              className={`progress-step ${currentStep >= step ? 'completed' : ''} ${currentStep === step ? 'active' : ''}`}
            >
              <span className="step-number">{step}</span>
            </div>
            <div className="step-meta">
              <span className="step-label">{label}</span>
              <span className="step-description">{description}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="application-container">
      {/* Application Header */}
      <header className="application-header">
        <div className="header-container">
          <div className="brand-section">
            <h1 className="application-title">Barcode Generation Platform</h1>
            <p className="application-tagline">Enterprise-grade barcode solutions with professional delivery</p>
          </div>
          <div className="capability-indicators">
            <div className="indicator-item">
              <span className="indicator-value">6</span>
              <span className="indicator-label">Standards</span>
            </div>
            <div className="indicator-item">
              <span className="indicator-value">10K</span>
              <span className="indicator-label">Max Units</span>
            </div>
            <div className="indicator-item">
              <span className="indicator-value">ISO</span>
              <span className="indicator-label">Compliant</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Application Content */}
      <main className="application-main">
        <div className="content-container">
          {renderProgressIndicator()}
          
          <div className="step-content">
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
            {currentStep === 4 && renderStep4()}
          </div>
        </div>
      </main>

      {/* Application Footer */}
      <footer className="application-footer">
        <div className="footer-container">
          <div className="footer-content">
            <span className="copyright">© 2024 Barcode Generation Platform</span>
            <div className="footer-links">
              <span className="footer-link">Enterprise Solutions</span>
              <span className="footer-separator">•</span>
              <span className="footer-link">API Documentation</span>
              <span className="footer-separator">•</span>
              <span className="footer-link">Support</span>
            </div>
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