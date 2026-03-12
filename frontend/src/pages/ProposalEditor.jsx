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
  staffing_plan: 'Staffing Plan',
  compliance_checklist: 'Compliance Checklist',
};

const quillModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ indent: '-1' }, { indent: '+1' }],
    [{ align: [] }],
    ['blockquote'],
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
];

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

  useEffect(() => {
    if (location.state?.proposal) {
      const proposalData = location.state.proposal;
      // The proposal may have a "sections" key or the sections directly
      const sectionContent = proposalData.sections || proposalData;

      // Store metadata for export
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

      // Set first section as active
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
      // Build export payload matching backend ExportRequest schema
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

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `proposal.${format === 'pdf' ? 'pdf' : 'docx'}`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      alert(
        `Export failed: ${
          err.response?.data?.detail || err.message || 'Unknown error'
        }`
      );
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
              <svg
                className="animate-spin w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
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
              <svg
                className="animate-spin w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
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
                    <CheckCircleIcon
                      className={`w-4 h-4 flex-shrink-0 ${
                        activeSection === key ? 'text-accent' : 'text-gray-300'
                      }`}
                    />
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
                <div className="bg-navy/5 border-b border-gray-100 px-6 py-4 flex items-center gap-2">
                  <DocumentTextIcon className="w-5 h-5 text-navy" />
                  <h2 className="text-base font-semibold text-navy">
                    {sectionLabels[key] || key}
                  </h2>
                </div>
                <div className="p-4">
                  <ReactQuill
                    theme="snow"
                    value={sections[key]}
                    onChange={(content) => handleContentChange(key, content)}
                    modules={quillModules}
                    formats={quillFormats}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
