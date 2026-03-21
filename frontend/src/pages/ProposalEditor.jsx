import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import {
  DocumentArrowDownIcon,
  DocumentTextIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  ListBulletIcon,
  PlusIcon,
  TrashIcon,
  CurrencyDollarIcon,
  PhotoIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import api from '../services/api';

const sectionLabels = {
  cover_page: 'Cover Page',
  executive_summary: 'Executive Summary',
  vendor_profile: 'Vendor Profile',
  socioeconomic_status: 'Socioeconomic Status',
  capability_statement: 'Capability Statement',
  past_performance: 'Past Performance',
  technical_approach: 'Technical Approach',
  management_approach: 'Management Approach',
  staffing_plan: 'Staffing Plan',
  key_personnel: 'Key Personnel / Resumes',
  cost_price_proposal: 'Cost / Price Proposal',
  quality_assurance: 'Quality Assurance Plan',
  risk_mitigation: 'Risk Mitigation Plan',
  transition_plan: 'Transition / Phase-In Plan',
  subcontracting_plan: 'Small Business Subcontracting Plan',
  compliance_matrix: 'Compliance Matrix',
  implementation_timeline: 'Implementation Timeline',
  compliance_checklist: 'Compliance Checklist',
};

const quillModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ indent: '-1' }, { indent: '+1' }],
    [{ align: [] }],
    ['blockquote', 'image'],
    ['clean'],
  ],
};

const quillFormats = [
  'header',
  'bold',
  'italic',
  'underline',
  'strike',
  'list',
  'indent',
  'align',
  'blockquote',
  'image',
];

// Image hints for specific sections
const sectionImageHints = {
  cover_page: 'Add company logo or proposal cover image',
  executive_summary: 'Add company owner photo or key visual',
  vendor_profile: 'Add company logo or organizational chart',
  key_personnel: 'Add team member photos or headshots',
  technical_approach: 'Add architecture diagrams or process flows',
  implementation_timeline: 'Add Gantt chart or timeline graphic',
};

// Image upload component for proposal sections
function SectionImageUpload({ sectionKey, onImageInsert }) {
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await api.post('/api/upload-image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        const newImage = {
          url: res.data.url,
          filename: res.data.filename,
          name: file.name,
        };
        setImages((prev) => [...prev, newImage]);
        onImageInsert(res.data.url);
      } catch (err) {
        alert(`Upload failed: ${err.response?.data?.detail || err.message}`);
      }
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = async (img) => {
    try {
      await api.delete(`/api/upload-image/${img.filename}`);
    } catch {
      // ignore delete errors
    }
    setImages((prev) => prev.filter((i) => i.filename !== img.filename));
  };

  const hint = sectionImageHints[sectionKey];

  return (
    <div className="border-t border-gray-100 px-4 py-3 bg-gray-50/50">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-gray-500 flex items-center gap-1.5">
          <PhotoIcon className="w-4 h-4" />
          Section Images
          {hint && <span className="font-normal text-gray-400 ml-1">— {hint}</span>}
        </p>
        <label className="flex items-center gap-1 text-xs font-medium text-accent hover:text-accent-dark transition-colors cursor-pointer">
          <PlusIcon className="w-4 h-4" />
          {uploading ? 'Uploading...' : 'Upload Image'}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleUpload}
            className="hidden"
            disabled={uploading}
          />
        </label>
      </div>
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {images.map((img) => (
            <div key={img.filename} className="relative group">
              <img
                src={img.url}
                alt={img.name}
                className="w-20 h-20 object-cover rounded-lg border border-gray-200 shadow-sm"
              />
              <button
                onClick={() => removeImage(img)}
                className="absolute -top-1.5 -right-1.5 bg-white rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                <XCircleIcon className="w-5 h-5 text-red-400 hover:text-red-600" />
              </button>
              <p className="text-[10px] text-gray-400 mt-0.5 truncate max-w-[80px]">{img.name}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const defaultLineItem = () => ({
  id: Date.now() + Math.random(),
  clin: '',
  description: '',
  laborCategory: '',
  quantity: 1,
  unit: 'Hours',
  unitRate: 0,
  total: 0,
});

function PricingTable({ onContentUpdate }) {
  const [lineItems, setLineItems] = useState([defaultLineItem()]);
  const [odcs, setOdcs] = useState([{ id: Date.now(), description: '', amount: 0 }]);
  const [notes, setNotes] = useState('');

  const unitOptions = ['Hours', 'Months', 'Each', 'Lot', 'Days', 'FTE Years'];

  const updateLineItem = (id, field, value) => {
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unitRate') {
          updated.total = (parseFloat(updated.quantity) || 0) * (parseFloat(updated.unitRate) || 0);
        }
        return updated;
      })
    );
  };

  const addLineItem = () => setLineItems((prev) => [...prev, defaultLineItem()]);
  const removeLineItem = (id) => setLineItems((prev) => prev.filter((item) => item.id !== id));

  const addOdc = () => setOdcs((prev) => [...prev, { id: Date.now(), description: '', amount: 0 }]);
  const updateOdc = (id, field, value) =>
    setOdcs((prev) => prev.map((o) => (o.id === id ? { ...o, [field]: value } : o)));
  const removeOdc = (id) => setOdcs((prev) => prev.filter((o) => o.id !== id));

  const laborTotal = lineItems.reduce((sum, item) => sum + (item.total || 0), 0);
  const odcTotal = odcs.reduce((sum, o) => sum + (parseFloat(o.amount) || 0), 0);
  const grandTotal = laborTotal + odcTotal;

  // Sync pricing table data back to parent as HTML content
  useEffect(() => {
    const html = buildPricingHtml();
    onContentUpdate(html);
  }, [lineItems, odcs, notes]);

  const buildPricingHtml = () => {
    let html = '<h2>Cost / Price Proposal</h2>';
    html += '<h3>Labor Categories & Pricing</h3>';
    html += '<table style="width:100%;border-collapse:collapse;margin-bottom:16px">';
    html += '<tr style="background:#1e293b;color:white"><th style="padding:8px;border:1px solid #ddd;text-align:left">CLIN</th><th style="padding:8px;border:1px solid #ddd;text-align:left">Description</th><th style="padding:8px;border:1px solid #ddd;text-align:left">Labor Category</th><th style="padding:8px;border:1px solid #ddd;text-align:right">Qty</th><th style="padding:8px;border:1px solid #ddd;text-align:left">Unit</th><th style="padding:8px;border:1px solid #ddd;text-align:right">Unit Rate ($)</th><th style="padding:8px;border:1px solid #ddd;text-align:right">Total ($)</th></tr>';
    lineItems.forEach((item) => {
      html += `<tr><td style="padding:8px;border:1px solid #ddd">${item.clin}</td><td style="padding:8px;border:1px solid #ddd">${item.description}</td><td style="padding:8px;border:1px solid #ddd">${item.laborCategory}</td><td style="padding:8px;border:1px solid #ddd;text-align:right">${item.quantity}</td><td style="padding:8px;border:1px solid #ddd">${item.unit}</td><td style="padding:8px;border:1px solid #ddd;text-align:right">${parseFloat(item.unitRate).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td><td style="padding:8px;border:1px solid #ddd;text-align:right">${item.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td></tr>`;
    });
    html += `<tr style="background:#f1f5f9;font-weight:bold"><td colspan="6" style="padding:8px;border:1px solid #ddd;text-align:right">Labor Subtotal</td><td style="padding:8px;border:1px solid #ddd;text-align:right">$${laborTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td></tr>`;
    html += '</table>';

    if (odcs.length > 0) {
      html += '<h3>Other Direct Costs (ODCs)</h3>';
      html += '<table style="width:100%;border-collapse:collapse;margin-bottom:16px">';
      html += '<tr style="background:#1e293b;color:white"><th style="padding:8px;border:1px solid #ddd;text-align:left">Description</th><th style="padding:8px;border:1px solid #ddd;text-align:right">Amount ($)</th></tr>';
      odcs.forEach((o) => {
        html += `<tr><td style="padding:8px;border:1px solid #ddd">${o.description}</td><td style="padding:8px;border:1px solid #ddd;text-align:right">${parseFloat(o.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td></tr>`;
      });
      html += `<tr style="background:#f1f5f9;font-weight:bold"><td style="padding:8px;border:1px solid #ddd;text-align:right">ODC Subtotal</td><td style="padding:8px;border:1px solid #ddd;text-align:right">$${odcTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td></tr>`;
      html += '</table>';
    }

    html += `<h3>Total Proposed Price: $${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h3>`;
    if (notes) html += `<h3>Pricing Notes & Assumptions</h3><p>${notes}</p>`;
    return html;
  };

  const fmt = (n) =>
    '$' + (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-6">
      {/* Labor Line Items */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-navy flex items-center gap-2">
            <CurrencyDollarIcon className="w-4 h-4" />
            Labor Categories & Line Items
          </h3>
          <button
            onClick={addLineItem}
            className="flex items-center gap-1 text-xs font-medium text-accent hover:text-accent-dark transition-colors cursor-pointer"
          >
            <PlusIcon className="w-4 h-4" />
            Add Line Item
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-navy text-white">
                <th className="px-3 py-2.5 text-left font-medium rounded-tl-lg">CLIN</th>
                <th className="px-3 py-2.5 text-left font-medium">Description</th>
                <th className="px-3 py-2.5 text-left font-medium">Labor Category</th>
                <th className="px-3 py-2.5 text-right font-medium">Qty</th>
                <th className="px-3 py-2.5 text-left font-medium">Unit</th>
                <th className="px-3 py-2.5 text-right font-medium">Rate ($)</th>
                <th className="px-3 py-2.5 text-right font-medium">Total</th>
                <th className="px-3 py-2.5 rounded-tr-lg w-10"></th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item, idx) => (
                <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-2 py-1.5 border-b border-gray-100">
                    <input
                      type="text"
                      value={item.clin}
                      onChange={(e) => updateLineItem(item.id, 'clin', e.target.value)}
                      placeholder="0001"
                      className="w-16 px-2 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue/30"
                    />
                  </td>
                  <td className="px-2 py-1.5 border-b border-gray-100">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                      placeholder="e.g., IT Support Services"
                      className="w-full min-w-[140px] px-2 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue/30"
                    />
                  </td>
                  <td className="px-2 py-1.5 border-b border-gray-100">
                    <input
                      type="text"
                      value={item.laborCategory}
                      onChange={(e) => updateLineItem(item.id, 'laborCategory', e.target.value)}
                      placeholder="e.g., Sr. Developer"
                      className="w-full min-w-[120px] px-2 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue/30"
                    />
                  </td>
                  <td className="px-2 py-1.5 border-b border-gray-100">
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(item.id, 'quantity', e.target.value)}
                      min="0"
                      className="w-16 px-2 py-1.5 border border-gray-200 rounded text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue/30"
                    />
                  </td>
                  <td className="px-2 py-1.5 border-b border-gray-100">
                    <select
                      value={item.unit}
                      onChange={(e) => updateLineItem(item.id, 'unit', e.target.value)}
                      className="px-2 py-1.5 border border-gray-200 rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue/30"
                    >
                      {unitOptions.map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-1.5 border-b border-gray-100">
                    <input
                      type="number"
                      value={item.unitRate}
                      onChange={(e) => updateLineItem(item.id, 'unitRate', e.target.value)}
                      min="0"
                      step="0.01"
                      className="w-24 px-2 py-1.5 border border-gray-200 rounded text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue/30"
                    />
                  </td>
                  <td className="px-2 py-1.5 border-b border-gray-100 text-right text-xs font-semibold text-navy">
                    {fmt(item.total)}
                  </td>
                  <td className="px-2 py-1.5 border-b border-gray-100">
                    {lineItems.length > 1 && (
                      <button
                        onClick={() => removeLineItem(item.id)}
                        className="p-1 text-red-400 hover:text-red-600 transition-colors cursor-pointer"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-navy/5 font-semibold">
                <td colSpan="6" className="px-3 py-2.5 text-right text-sm text-navy">
                  Labor Subtotal
                </td>
                <td className="px-3 py-2.5 text-right text-sm text-navy">{fmt(laborTotal)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Other Direct Costs */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-navy">Other Direct Costs (ODCs)</h3>
          <button
            onClick={addOdc}
            className="flex items-center gap-1 text-xs font-medium text-accent hover:text-accent-dark transition-colors cursor-pointer"
          >
            <PlusIcon className="w-4 h-4" />
            Add ODC
          </button>
        </div>
        <div className="space-y-2">
          {odcs.map((odc) => (
            <div key={odc.id} className="flex items-center gap-3">
              <input
                type="text"
                value={odc.description}
                onChange={(e) => updateOdc(odc.id, 'description', e.target.value)}
                placeholder="e.g., Travel, Software Licenses, Equipment"
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue/30"
              />
              <div className="flex items-center gap-1">
                <span className="text-sm text-gray-400">$</span>
                <input
                  type="number"
                  value={odc.amount}
                  onChange={(e) => updateOdc(odc.id, 'amount', e.target.value)}
                  min="0"
                  step="0.01"
                  className="w-28 px-3 py-2 border border-gray-200 rounded-lg text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue/30"
                />
              </div>
              {odcs.length > 1 && (
                <button
                  onClick={() => removeOdc(odc.id)}
                  className="p-1.5 text-red-400 hover:text-red-600 transition-colors cursor-pointer"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-end mt-2 text-sm font-semibold text-navy">
          ODC Subtotal: {fmt(odcTotal)}
        </div>
      </div>

      {/* Grand Total */}
      <div className="bg-accent/10 border border-accent/20 rounded-xl p-5 flex items-center justify-between">
        <span className="text-lg font-bold text-navy">Total Proposed Price</span>
        <span className="text-2xl font-bold text-accent">{fmt(grandTotal)}</span>
      </div>

      {/* Pricing Notes */}
      <div>
        <h3 className="text-sm font-semibold text-navy mb-2">Pricing Notes & Assumptions</h3>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Enter cost assumptions, exclusions, basis of estimate, rate reasonableness justification..."
          rows={4}
          className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 resize-y"
        />
      </div>
    </div>
  );
}

export default function ProposalEditor() {
  const location = useLocation();
  const navigate = useNavigate();
  const sectionRefs = useRef({});

  const [sections, setSections] = useState({});
  const [sectionTitles, setSectionTitles] = useState({});
  const [proposalTitle, setProposalTitle] = useState('Government Proposal');
  const [vendorName, setVendorName] = useState('');
  const [activeSection, setActiveSection] = useState('');
  const [exporting, setExporting] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const quillRefs = useRef({});

  useEffect(() => {
    if (location.state?.proposal) {
      const proposalData = location.state.proposal;
      const sectionContent = proposalData.sections || proposalData;

      if (proposalData.opportunity_title) setProposalTitle(proposalData.opportunity_title);
      if (proposalData.vendor_name) setVendorName(proposalData.vendor_name);

      const parsed = {};
      const titles = {};
      for (const [key, value] of Object.entries(sectionContent)) {
        if (sectionLabels[key]) {
          parsed[key] = typeof value === 'string' ? value : value?.content || '';
          titles[key] = typeof value === 'string' ? (sectionLabels[key] || key) : value?.title || sectionLabels[key] || key;
        }
      }
      setSections(parsed);
      setSectionTitles(titles);

      const firstKey = Object.keys(parsed)[0];
      if (firstKey) setActiveSection(firstKey);
    }
  }, [location.state]);

  const handleContentChange = (key, content) => {
    setSections((prev) => ({ ...prev, [key]: content }));
  };

  const scrollToSection = (key) => {
    setActiveSection(key);
    const el = sectionRefs.current[key];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleExport = async (format) => {
    setExporting(format);
    try {
      const exportSections = {};
      for (const [key, content] of Object.entries(sections)) {
        exportSections[key] = {
          title: sectionTitles[key] || sectionLabels[key] || key,
          content: content,
        };
      }
      const payload = {
        proposal_title: proposalTitle,
        vendor_name: vendorName,
        sections: exportSections,
      };

      const response = await api.post(`/api/export/${format}`, payload, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `proposal.${format === 'pdf' ? 'pdf' : 'docx'}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      alert(`Export failed: ${err.response?.data?.detail || err.message || 'Unknown error'}`);
    } finally {
      setExporting('');
    }
  };

  const sectionKeys = Object.keys(sections);

  if (sectionKeys.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <DocumentTextIcon className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-navy mb-2">No Proposal to Edit</h2>
          <p className="text-gray-500 text-sm mb-6">
            Generate a proposal first to start editing.
          </p>
          <button
            onClick={() => navigate('/new-proposal')}
            className="bg-accent hover:bg-accent-dark text-white px-6 py-3 rounded-lg font-medium text-sm transition-all cursor-pointer"
          >
            Generate New Proposal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-full mx-auto -m-6 lg:-m-8">
      {/* Top Toolbar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-16 z-30">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/new-proposal')}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-navy transition-colors cursor-pointer"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Back
          </button>
          <div className="h-5 w-px bg-gray-200" />
          <h1 className="text-lg font-semibold text-navy">Proposal Editor</h1>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-1.5 rounded-md hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <ListBulletIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleExport('pdf')}
            disabled={!!exporting}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-navy hover:bg-navy-light text-white transition-all disabled:opacity-50 cursor-pointer"
          >
            {exporting === 'pdf' ? (
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <DocumentArrowDownIcon className="w-4 h-4" />
            )}
            Export PDF
          </button>
          <button
            onClick={() => handleExport('docx')}
            disabled={!!exporting}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue hover:bg-blue-light text-white transition-all disabled:opacity-50 cursor-pointer"
          >
            {exporting === 'docx' ? (
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <DocumentArrowDownIcon className="w-4 h-4" />
            )}
            Export DOCX
          </button>
        </div>
      </div>

      <div className="flex">
        {/* Section Sidebar */}
        <aside
          className={`w-64 bg-white border-r border-gray-200 sticky top-[7.5rem] h-[calc(100vh-7.5rem)] overflow-y-auto flex-shrink-0 transition-all ${
            sidebarOpen ? 'block' : 'hidden lg:block'
          }`}
        >
          <div className="p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Sections
            </p>
            <nav className="space-y-1">
              {sectionKeys.map((key) => (
                <button
                  key={key}
                  onClick={() => scrollToSection(key)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                    activeSection === key
                      ? 'bg-navy text-white shadow-sm'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-navy'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {key === 'cost_price_proposal' ? (
                      <CurrencyDollarIcon
                        className={`w-4 h-4 flex-shrink-0 ${
                          activeSection === key ? 'text-accent' : 'text-green-400'
                        }`}
                      />
                    ) : (
                      <CheckCircleIcon
                        className={`w-4 h-4 flex-shrink-0 ${
                          activeSection === key ? 'text-accent' : 'text-gray-300'
                        }`}
                      />
                    )}
                    {sectionLabels[key] || key}
                  </div>
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main Editor Area */}
        <div className="flex-1 p-6 lg:p-8 overflow-y-auto max-h-[calc(100vh-7.5rem)]">
          <div className="max-w-4xl mx-auto space-y-8">
            {sectionKeys.map((key) => (
              <div
                key={key}
                ref={(el) => (sectionRefs.current[key] = el)}
                className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
              >
                <div className={`border-b border-gray-100 px-6 py-4 flex items-center gap-2 ${
                  key === 'cost_price_proposal' ? 'bg-green-50' : 'bg-navy/5'
                }`}>
                  {key === 'cost_price_proposal' ? (
                    <CurrencyDollarIcon className="w-5 h-5 text-green-600" />
                  ) : (
                    <DocumentTextIcon className="w-5 h-5 text-navy" />
                  )}
                  <h2 className="text-base font-semibold text-navy">
                    {sectionLabels[key] || key}
                  </h2>
                  {key === 'cost_price_proposal' && (
                    <span className="ml-auto text-xs font-medium text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                      Interactive Pricing
                    </span>
                  )}
                </div>
                <div className="p-4">
                  {key === 'cost_price_proposal' ? (
                    <PricingTable
                      onContentUpdate={(html) => handleContentChange(key, html)}
                    />
                  ) : (
                    <ReactQuill
                      ref={(el) => { quillRefs.current[key] = el; }}
                      theme="snow"
                      value={sections[key]}
                      onChange={(content) => handleContentChange(key, content)}
                      modules={quillModules}
                      formats={quillFormats}
                    />
                  )}
                </div>
                {/* Image upload area for each section */}
                <SectionImageUpload
                  sectionKey={key}
                  onImageInsert={(imageUrl) => {
                    if (key === 'cost_price_proposal') return;
                    const quill = quillRefs.current[key]?.getEditor?.();
                    if (quill) {
                      const range = quill.getSelection(true);
                      const pos = range ? range.index : quill.getLength();
                      quill.insertEmbed(pos, 'image', imageUrl);
                      quill.setSelection(pos + 1);
                    }
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
