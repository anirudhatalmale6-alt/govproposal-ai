import { useState, useEffect, useRef } from 'react';
import {
  UserCircleIcon,
  BuildingOffice2Icon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  DocumentCheckIcon,
  BriefcaseIcon,
  PlusIcon,
  TrashIcon,
  PhotoIcon,
  SparklesIcon,
  UserGroupIcon,
  StarIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import api from '../services/api';
import NaicsCodeSelector from '../components/NaicsCodeSelector';

const socioeconomicOptions = [
  'Small Business',
  '8(a)',
  'HUBZone',
  'SDVOSB',
  'WOSB',
  'EDWOSB',
  'Large Business',
];

const classificationOptions = [
  'Small Disadvantaged Business (SDB)',
  'Women-Owned Small Business (WOSB)',
  'Economically Disadvantaged WOSB (EDWOSB)',
  'Veteran-Owned Small Business (VOSB)',
  'Service-Disabled Veteran-Owned (SDVOSB)',
  'HUBZone Certified',
  '8(a) Business Development',
  'Minority-Owned Business',
  'Disadvantaged Business Enterprise (DBE)',
];

const orgTypeOptions = [
  'LLC',
  'Corporation',
  'S-Corporation',
  'Sole Proprietorship',
  'Partnership',
  'Joint Venture',
  'Nonprofit',
];

const clearanceLevelOptions = [
  'None',
  'Confidential',
  'Secret',
  'Top Secret',
  'Top Secret/SCI',
];

const samStatusOptions = ['Active', 'Inactive', 'Expired', 'Not Registered'];

const INPUT_CLASS =
  'w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue transition-all';
const SELECT_CLASS = `${INPUT_CLASS} bg-white`;
const LABEL_CLASS = 'block text-sm font-medium text-gray-700 mb-1.5';

// Section wrapper — defined outside component to avoid re-mount on every render
function Section({ icon: Icon, title, children }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
      <h2 className="text-lg font-semibold text-navy mb-5 flex items-center gap-2">
        <Icon className="w-5 h-5" />
        {title}
      </h2>
      {children}
    </div>
  );
}

// Team member card — defined outside component to avoid re-mount on every render
function TeamMemberCard({ member, field, index, onUpdate, onRemove, onImageUpload }) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50/50 relative">
      <button
        type="button"
        onClick={() => onRemove(field, index)}
        className="absolute top-3 right-3 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors cursor-pointer"
      >
        <TrashIcon className="w-4 h-4" />
      </button>
      <div className="flex gap-4">
        <div className="flex-shrink-0">
          {member.photo ? (
            <div className="relative group">
              <img
                src={member.photo}
                alt={member.name || 'Team member'}
                className="w-20 h-24 object-cover rounded-lg border border-gray-200"
              />
              <button
                type="button"
                onClick={() => onUpdate(field, index, 'photo', '')}
                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                <TrashIcon className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onImageUpload((img) => onUpdate(field, index, 'photo', img))}
              className="w-20 h-24 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center bg-white hover:border-gray-400 transition-colors cursor-pointer"
            >
              <PhotoIcon className="w-6 h-6 text-gray-300" />
              <span className="text-[10px] text-gray-400 mt-1">Photo</span>
            </button>
          )}
        </div>
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
            <input
              type="text"
              value={member.name || ''}
              onChange={(e) => onUpdate(field, index, 'name', e.target.value)}
              placeholder="Full Name"
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Designation</label>
            <input
              type="text"
              value={member.designation || ''}
              onChange={(e) => onUpdate(field, index, 'designation', e.target.value)}
              placeholder="e.g., CEO, CTO, VP Operations"
              className={INPUT_CLASS}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">Experience & About</label>
            <textarea
              value={member.about || ''}
              onChange={(e) => onUpdate(field, index, 'about', e.target.value)}
              placeholder="Brief description of experience, expertise, and background..."
              rows={2}
              className={`${INPUT_CLASS} resize-y`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

const certificationOptions = [
  'ISO 9001',
  'ISO 27001',
  'ISO 20000',
  'CMMI Level 3',
  'CMMI Level 5',
  'FedRAMP',
  'SOC 2 Type II',
  'PMP',
  'ITIL',
  'CMMC Level 1',
  'CMMC Level 2',
  'CMMC Level 3',
];

const contractVehicleOptions = [
  'GSA MAS/Schedule',
  'SEWP V',
  'STARS III',
  'CIO-SP4',
  'OASIS+',
  'Alliant 3',
  'VETS 2',
  '8(a) STARS III',
  'ITES-SW2',
];

const initialProfile = {
  company_logo: '',
  company_name: '',
  cage_code: '',
  duns_number: '',
  ein_tin: '',
  business_registration_date: '',
  naics_codes: [],
  business_classifications: [],
  about_company: '',
  management_team: [],
  executive_team: [],
  past_performances: [],
  capability_statement: '',
  capability_examples: [],
  socioeconomic_status: 'Small Business',
  organizational_type: 'LLC',
  state_of_incorporation: '',
  years_in_business: '',
  number_of_employees: '',
  annual_revenue: '',
  sam_registration_status: 'Not Registered',
  sam_expiration_date: '',
  security_clearance_level: 'None',
  certifications: [],
  contract_vehicles: [],
  registered_address_line1: '',
  registered_address_line2: '',
  registered_address_city: '',
  registered_address_state: '',
  registered_address_zip: '',
  registered_address_country: '',
  branches: [],
  government_portals: [],
  sam_login_user: '',
  sam_login_password: '',
  contact_name: '',
  contact_email: '',
  contact_phone: '',
  contact_address: '',
};

export default function VendorProfile() {
  const [profile, setProfile] = useState(initialProfile);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const logoInputRef = useRef(null);

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      setError('Please upload a valid image file (JPG, PNG, GIF, WebP, or SVG).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Logo file must be under 5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      handleChange('company_logo', event.target.result);
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    handleChange('company_logo', '');
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  const handleImageUpload = (callback) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/gif,image/webp';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) {
        setError('Image must be under 5MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => callback(ev.target.result);
      reader.readAsDataURL(file);
    };
    input.click();
  };

  useEffect(() => {
    const saved = localStorage.getItem('vendorProfile');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (typeof parsed.naics_codes === 'string') {
          parsed.naics_codes = parsed.naics_codes.split(',').map((c) => c.trim()).filter(Boolean);
        }
        setProfile({ ...initialProfile, ...parsed });
      } catch { /* ignore */ }
    }
  }, []);

  const handleChange = (field, value) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
    setSuccess('');
    setError('');
  };

  // Generic array item helpers
  const addArrayItem = (field, template) => {
    setProfile((prev) => ({ ...prev, [field]: [...(prev[field] || []), template] }));
    setSuccess('');
  };

  const updateArrayItem = (field, index, key, value) => {
    setProfile((prev) => {
      const arr = [...(prev[field] || [])];
      arr[index] = { ...arr[index], [key]: value };
      return { ...prev, [field]: arr };
    });
    setSuccess('');
  };

  const removeArrayItem = (field, index) => {
    setProfile((prev) => ({
      ...prev,
      [field]: (prev[field] || []).filter((_, i) => i !== index),
    }));
    setSuccess('');
  };

  const toggleArrayItem = (field, item) => {
    setProfile((prev) => {
      const arr = prev[field] || [];
      return {
        ...prev,
        [field]: arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item],
      };
    });
    setSuccess('');
  };

  const handleAiAssist = async (field) => {
    if (!profile.company_name) {
      setError('Please enter your company name first.');
      return;
    }
    setAiLoading(true);
    setError('');
    try {
      const prompts = {
        about_company: `Write a professional "About Us" section for a government contracting company named "${profile.company_name}". The company is a ${profile.organizational_type} in ${profile.state_of_incorporation || 'the United States'} with ${profile.years_in_business || 'several'} years in business and ${profile.number_of_employees || 'multiple'} employees. Keep it 2-3 paragraphs, professional, and suitable for federal proposals.`,
        capability_statement: `Write a capability statement for "${profile.company_name}", a government contractor. Include core competencies, differentiators, and value propositions. Keep it concise and suitable for a federal proposal. 2-3 paragraphs.`,
      };
      const response = await api.post('/api/proposals/generate-section', {
        section_key: 'about',
        prompt: prompts[field],
        opportunity_title: profile.company_name,
        vendor_profile: profile,
      });
      const content = response.data.content || response.data.text || '';
      if (content) {
        handleChange(field, content.replace(/<[^>]+>/g, ''));
      }
    } catch {
      setError('AI generation failed. Please write manually or try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccess('');
    setError('');
    try {
      localStorage.setItem('vendorProfile', JSON.stringify(profile));
      await api.post('/api/vendor-profile', profile);
      setSuccess('Vendor profile saved successfully.');
    } catch {
      setSuccess('Profile saved locally.');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = INPUT_CLASS;
  const selectClass = SELECT_CLASS;
  const labelClass = LABEL_CLASS;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-navy">Vendor Profile</h1>
        <p className="text-gray-500 mt-1">Manage your company information for proposal generation</p>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-center gap-3">
          <CheckCircleIcon className="w-5 h-5 text-accent flex-shrink-0" />
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center gap-3">
          <ExclamationTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>

        {/* ─── 1. COMPANY INFORMATION ──────────────────────────── */}
        <Section icon={BuildingOffice2Icon} title="Company Information">
          {/* Logo Upload */}
          <div className="mb-6 pb-6 border-b border-gray-100">
            <label className={labelClass}>
              <span className="flex items-center gap-2"><PhotoIcon className="w-4 h-4" /> Company Logo</span>
              <span className="text-xs text-gray-400 font-normal mt-0.5 block">
                JPG, PNG, GIF, WebP, or SVG — max 5MB. Appears on proposal cover pages.
              </span>
            </label>
            <div className="flex items-center gap-5 mt-3">
              {profile.company_logo ? (
                <div className="relative group">
                  <img src={profile.company_logo} alt="Company logo" className="w-24 h-24 object-contain rounded-lg border border-gray-200 bg-white p-1" />
                  <button type="button" onClick={removeLogo} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <TrashIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
                  <PhotoIcon className="w-8 h-8 text-gray-300" />
                </div>
              )}
              <div>
                <input ref={logoInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml" onChange={handleLogoUpload} className="hidden" />
                <button type="button" onClick={() => logoInputRef.current?.click()} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-navy bg-navy/5 hover:bg-navy/10 rounded-lg transition-colors cursor-pointer">
                  <PhotoIcon className="w-4 h-4" />
                  {profile.company_logo ? 'Change Logo' : 'Upload Logo'}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <label className={labelClass}>Company Name <span className="text-red-400">*</span></label>
              <input type="text" required value={profile.company_name} onChange={(e) => handleChange('company_name', e.target.value)} placeholder="e.g., Acme Federal Solutions, LLC" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>CAGE Code</label>
              <input type="text" value={profile.cage_code} onChange={(e) => handleChange('cage_code', e.target.value)} placeholder="e.g., 5ABC1" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>DUNS/UEI Number</label>
              <input type="text" value={profile.duns_number} onChange={(e) => handleChange('duns_number', e.target.value)} placeholder="e.g., 123456789" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>EIN/TIN</label>
              <input type="text" value={profile.ein_tin} onChange={(e) => handleChange('ein_tin', e.target.value)} placeholder="e.g., 12-3456789" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Business Registration / Incorporation Date</label>
              <input type="date" value={profile.business_registration_date} onChange={(e) => handleChange('business_registration_date', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Organizational Type</label>
              <select value={profile.organizational_type} onChange={(e) => handleChange('organizational_type', e.target.value)} className={selectClass}>
                {orgTypeOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>State of Incorporation</label>
              <input type="text" value={profile.state_of_incorporation} onChange={(e) => handleChange('state_of_incorporation', e.target.value)} placeholder="e.g., Virginia" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Socioeconomic Status</label>
              <select value={profile.socioeconomic_status} onChange={(e) => handleChange('socioeconomic_status', e.target.value)} className={selectClass}>
                {socioeconomicOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Years in Business</label>
              <input type="number" min="0" value={profile.years_in_business} onChange={(e) => handleChange('years_in_business', e.target.value)} placeholder="e.g., 10" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Number of Employees</label>
              <input type="text" value={profile.number_of_employees} onChange={(e) => handleChange('number_of_employees', e.target.value)} placeholder="e.g., 150" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Annual Revenue</label>
              <input type="text" value={profile.annual_revenue} onChange={(e) => handleChange('annual_revenue', e.target.value)} placeholder="e.g., $25M" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Facility Security Clearance Level</label>
              <select value={profile.security_clearance_level} onChange={(e) => handleChange('security_clearance_level', e.target.value)} className={selectClass}>
                {clearanceLevelOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>
                NAICS / SIC Code <span className="text-gray-400 font-normal">(select from official 2022 NAICS list)</span>
              </label>
              <NaicsCodeSelector selectedCodes={profile.naics_codes || []} onChange={(codes) => handleChange('naics_codes', codes)} />
            </div>
          </div>

          {/* About Company */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <label className={labelClass + ' mb-0'}>
                About Company
              </label>
              <button
                type="button"
                onClick={() => handleAiAssist('about_company')}
                disabled={aiLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                <SparklesIcon className="w-3.5 h-3.5" />
                {aiLoading ? 'Generating...' : 'AI Assist'}
              </button>
            </div>
            <textarea
              value={profile.about_company || ''}
              onChange={(e) => handleChange('about_company', e.target.value)}
              placeholder="Write about your company — history, mission, vision, and what makes you unique in government contracting..."
              rows={5}
              className={`${inputClass} resize-y`}
            />
          </div>

          {/* Management Team */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <label className={labelClass + ' mb-0'}>
                <span className="flex items-center gap-2"><UserGroupIcon className="w-4 h-4" /> Management Team</span>
              </label>
              <button
                type="button"
                onClick={() => addArrayItem('management_team', { name: '', designation: '', about: '', photo: '' })}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-navy bg-navy/5 hover:bg-navy/10 rounded-lg transition-colors cursor-pointer"
              >
                <PlusIcon className="w-3.5 h-3.5" /> Add Member
              </button>
            </div>
            {(profile.management_team || []).length === 0 ? (
              <p className="text-sm text-gray-400 italic">No management team members added.</p>
            ) : (
              <div className="space-y-3">
                {(profile.management_team || []).map((member, i) => (
                  <TeamMemberCard key={i} member={member} field="management_team" index={i} onUpdate={updateArrayItem} onRemove={removeArrayItem} onImageUpload={handleImageUpload} />
                ))}
              </div>
            )}
          </div>

          {/* Executive Team */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <label className={labelClass + ' mb-0'}>
                <span className="flex items-center gap-2"><UserGroupIcon className="w-4 h-4" /> Executive Team</span>
              </label>
              <button
                type="button"
                onClick={() => addArrayItem('executive_team', { name: '', designation: '', about: '', photo: '' })}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-navy bg-navy/5 hover:bg-navy/10 rounded-lg transition-colors cursor-pointer"
              >
                <PlusIcon className="w-3.5 h-3.5" /> Add Member
              </button>
            </div>
            {(profile.executive_team || []).length === 0 ? (
              <p className="text-sm text-gray-400 italic">No executive team members added.</p>
            ) : (
              <div className="space-y-3">
                {(profile.executive_team || []).map((member, i) => (
                  <TeamMemberCard key={i} member={member} field="executive_team" index={i} onUpdate={updateArrayItem} onRemove={removeArrayItem} onImageUpload={handleImageUpload} />
                ))}
              </div>
            )}
          </div>

          {/* Past Performance */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <label className={labelClass + ' mb-0'}>
                <span className="flex items-center gap-2"><StarIcon className="w-4 h-4" /> Past Performance</span>
              </label>
              <button
                type="button"
                onClick={() => addArrayItem('past_performances', { client_name: '', contract_title: '', description: '', logo: '' })}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-navy bg-navy/5 hover:bg-navy/10 rounded-lg transition-colors cursor-pointer"
              >
                <PlusIcon className="w-3.5 h-3.5" /> Add Performance
              </button>
            </div>
            {(profile.past_performances || []).length === 0 ? (
              <p className="text-sm text-gray-400 italic">No past performance entries added.</p>
            ) : (
              <div className="space-y-3">
                {(profile.past_performances || []).map((perf, i) => (
                  <div key={i} className="border border-gray-200 rounded-lg p-4 bg-gray-50/50 relative">
                    <button type="button" onClick={() => removeArrayItem('past_performances', i)} className="absolute top-3 right-3 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors cursor-pointer">
                      <TrashIcon className="w-4 h-4" />
                    </button>
                    <div className="flex gap-4">
                      <div className="flex-shrink-0">
                        {perf.logo ? (
                          <div className="relative group">
                            <img src={perf.logo} alt={perf.client_name || 'Client'} className="w-20 h-20 object-contain rounded-lg border border-gray-200 bg-white p-1" />
                            <button type="button" onClick={() => updateArrayItem('past_performances', i, 'logo', '')} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                              <TrashIcon className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleImageUpload((img) => updateArrayItem('past_performances', i, 'logo', img))}
                            className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center bg-white hover:border-gray-400 transition-colors cursor-pointer"
                          >
                            <PhotoIcon className="w-6 h-6 text-gray-300" />
                            <span className="text-[10px] text-gray-400 mt-1">Logo</span>
                          </button>
                        )}
                      </div>
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 pr-6">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Client / Agency Name</label>
                          <input type="text" value={perf.client_name || ''} onChange={(e) => updateArrayItem('past_performances', i, 'client_name', e.target.value)} placeholder="e.g., Department of Defense" className={inputClass} />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Contract Title</label>
                          <input type="text" value={perf.contract_title || ''} onChange={(e) => updateArrayItem('past_performances', i, 'contract_title', e.target.value)} placeholder="e.g., IT Modernization Phase II" className={inputClass} />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs font-medium text-gray-500 mb-1">Description & Results</label>
                          <textarea value={perf.description || ''} onChange={(e) => updateArrayItem('past_performances', i, 'description', e.target.value)} placeholder="Describe the contract scope, your role, and key outcomes..." rows={2} className={`${inputClass} resize-y`} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Capability Statement */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <label className={labelClass + ' mb-0'}>
                <span className="flex items-center gap-2"><DocumentTextIcon className="w-4 h-4" /> Capability Statement</span>
              </label>
              <button
                type="button"
                onClick={() => handleAiAssist('capability_statement')}
                disabled={aiLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                <SparklesIcon className="w-3.5 h-3.5" />
                {aiLoading ? 'Generating...' : 'AI Assist'}
              </button>
            </div>
            <textarea
              value={profile.capability_statement || ''}
              onChange={(e) => handleChange('capability_statement', e.target.value)}
              placeholder="Describe your core competencies, differentiators, and value proposition..."
              rows={5}
              className={`${inputClass} resize-y`}
            />
            {/* Capability Examples */}
            <div className="mt-3">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-medium text-gray-500">Examples</label>
                <button
                  type="button"
                  onClick={() => addArrayItem('capability_examples', { title: '', description: '' })}
                  className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-navy bg-navy/5 hover:bg-navy/10 rounded transition-colors cursor-pointer"
                >
                  <PlusIcon className="w-3 h-3" /> Add Example
                </button>
              </div>
              {(profile.capability_examples || []).map((ex, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={ex.title || ''}
                    onChange={(e) => updateArrayItem('capability_examples', i, 'title', e.target.value)}
                    placeholder="Example title"
                    className={`${inputClass} flex-1`}
                  />
                  <input
                    type="text"
                    value={ex.description || ''}
                    onChange={(e) => updateArrayItem('capability_examples', i, 'description', e.target.value)}
                    placeholder="Brief description"
                    className={`${inputClass} flex-[2]`}
                  />
                  <button type="button" onClick={() => removeArrayItem('capability_examples', i)} className="p-2 text-gray-400 hover:text-red-500 cursor-pointer">
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* ─── 2. ADDRESS ──────────────────────────────────────── */}
        <Section icon={MapPinIcon} title="Address">
          <div className="space-y-5">
            <div>
              <label className={labelClass}>Registered / Headquarters Address</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <input type="text" value={profile.registered_address_line1} onChange={(e) => handleChange('registered_address_line1', e.target.value)} placeholder="Address Line 1" className={inputClass} />
                </div>
                <div className="md:col-span-2">
                  <input type="text" value={profile.registered_address_line2} onChange={(e) => handleChange('registered_address_line2', e.target.value)} placeholder="Address Line 2 (optional)" className={inputClass} />
                </div>
                <div><input type="text" value={profile.registered_address_city} onChange={(e) => handleChange('registered_address_city', e.target.value)} placeholder="City" className={inputClass} /></div>
                <div><input type="text" value={profile.registered_address_state} onChange={(e) => handleChange('registered_address_state', e.target.value)} placeholder="State" className={inputClass} /></div>
                <div><input type="text" value={profile.registered_address_zip} onChange={(e) => handleChange('registered_address_zip', e.target.value)} placeholder="Zip Code" className={inputClass} /></div>
                <div><input type="text" value={profile.registered_address_country} onChange={(e) => handleChange('registered_address_country', e.target.value)} placeholder="Country" className={inputClass} /></div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className={labelClass + ' mb-0'}>Branch Offices <span className="text-gray-400 font-normal">(optional)</span></label>
                <button type="button" onClick={() => addArrayItem('branches', { name: '', line1: '', line2: '', city: '', state: '', zip: '', country: '' })} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-navy bg-navy/5 hover:bg-navy/10 rounded-lg transition-colors cursor-pointer">
                  <PlusIcon className="w-3.5 h-3.5" /> Add Branch
                </button>
              </div>
              {(profile.branches || []).length === 0 ? (
                <p className="text-sm text-gray-400 italic">No branch offices added.</p>
              ) : (
                <div className="space-y-3">
                  {(profile.branches || []).map((branch, i) => (
                    <div key={i} className="border border-gray-200 rounded-lg p-4 bg-gray-50/50 relative">
                      <button type="button" onClick={() => removeArrayItem('branches', i)} className="absolute top-3 right-3 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors cursor-pointer">
                        <TrashIcon className="w-4 h-4" />
                      </button>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pr-8">
                        <div className="md:col-span-2">
                          <label className="block text-xs font-medium text-gray-500 mb-1">Branch Name</label>
                          <input type="text" value={branch.name} onChange={(e) => updateArrayItem('branches', i, 'name', e.target.value)} placeholder="e.g., West Coast Office" className={inputClass} />
                        </div>
                        <div className="md:col-span-2"><input type="text" value={branch.line1 || ''} onChange={(e) => updateArrayItem('branches', i, 'line1', e.target.value)} placeholder="Address Line 1" className={inputClass} /></div>
                        <div className="md:col-span-2"><input type="text" value={branch.line2 || ''} onChange={(e) => updateArrayItem('branches', i, 'line2', e.target.value)} placeholder="Address Line 2 (optional)" className={inputClass} /></div>
                        <div><input type="text" value={branch.city || ''} onChange={(e) => updateArrayItem('branches', i, 'city', e.target.value)} placeholder="City" className={inputClass} /></div>
                        <div><input type="text" value={branch.state || ''} onChange={(e) => updateArrayItem('branches', i, 'state', e.target.value)} placeholder="State" className={inputClass} /></div>
                        <div><input type="text" value={branch.zip || ''} onChange={(e) => updateArrayItem('branches', i, 'zip', e.target.value)} placeholder="Zip Code" className={inputClass} /></div>
                        <div><input type="text" value={branch.country || ''} onChange={(e) => updateArrayItem('branches', i, 'country', e.target.value)} placeholder="Country" className={inputClass} /></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Section>

        {/* ─── 3. BUSINESS CLASSIFICATION ──────────────────────── */}
        <Section icon={ShieldCheckIcon} title="Business Classification">
          <label className={labelClass}>Select all classifications that apply to your business</label>
          <div className="flex flex-wrap gap-2">
            {classificationOptions.map((cls) => {
              const isSelected = (profile.business_classifications || []).includes(cls);
              return (
                <button key={cls} type="button" onClick={() => toggleArrayItem('business_classifications', cls)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${isSelected ? 'bg-navy text-white border-navy' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}
                >
                  {isSelected && '✓ '}{cls}
                </button>
              );
            })}
          </div>
        </Section>

        {/* ─── 4. CERTIFICATIONS ───────────────────────────────── */}
        <Section icon={DocumentCheckIcon} title="Certifications">
          <label className={labelClass}>Select all certifications that apply <span className="text-gray-400 font-normal">(select all that apply)</span></label>
          <div className="flex flex-wrap gap-2">
            {certificationOptions.map((cert) => {
              const isSelected = (profile.certifications || []).includes(cert);
              return (
                <button key={cert} type="button" onClick={() => toggleArrayItem('certifications', cert)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${isSelected ? 'bg-navy text-white border-navy' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}
                >
                  {isSelected && '✓ '}{cert}
                </button>
              );
            })}
          </div>
        </Section>

        {/* ─── 5. CONTRACT VEHICLES ────────────────────────────── */}
        <Section icon={BriefcaseIcon} title="Contract Vehicles">
          <label className={labelClass}>Select all contract vehicles <span className="text-gray-400 font-normal">(select all that apply)</span></label>
          <div className="flex flex-wrap gap-2">
            {contractVehicleOptions.map((cv) => {
              const isSelected = (profile.contract_vehicles || []).includes(cv);
              return (
                <button key={cv} type="button" onClick={() => toggleArrayItem('contract_vehicles', cv)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${isSelected ? 'bg-accent text-white border-accent' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}
                >
                  {isSelected && '✓ '}{cv}
                </button>
              );
            })}
          </div>
        </Section>

        {/* ─── 6. GOVERNMENT REGISTRATION ──────────────────────── */}
        <Section icon={ShieldCheckIcon} title="Government Registration">
          {/* SAM.gov Registration */}
          <div className="mb-6 pb-6 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-navy mb-4">SAM.gov Registration</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={labelClass}>Registration Status</label>
                <select value={profile.sam_registration_status} onChange={(e) => handleChange('sam_registration_status', e.target.value)} className={selectClass}>
                  {samStatusOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Expiration Date</label>
                <input type="date" value={profile.sam_expiration_date} onChange={(e) => handleChange('sam_expiration_date', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>SAM.gov User ID</label>
                <input type="text" value={profile.sam_login_user} onChange={(e) => handleChange('sam_login_user', e.target.value)} placeholder="Your SAM.gov login username" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>SAM.gov Password</label>
                <input type="password" value={profile.sam_login_password} onChange={(e) => handleChange('sam_login_password', e.target.value)} placeholder="Your SAM.gov login password" className={inputClass} />
              </div>
            </div>
          </div>

          {/* Other Government Portals */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-navy">Other Government Registrations</h3>
              <button type="button" onClick={() => addArrayItem('government_portals', { portal: '', registration_id: '', status: 'Registered' })} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-navy bg-navy/5 hover:bg-navy/10 rounded-lg transition-colors cursor-pointer">
                <PlusIcon className="w-3.5 h-3.5" /> Add Portal
              </button>
            </div>
            {(profile.government_portals || []).length === 0 ? (
              <p className="text-sm text-gray-400 italic">No other government portals added.</p>
            ) : (
              <div className="space-y-3">
                {(profile.government_portals || []).map((portal, i) => (
                  <div key={i} className="border border-gray-200 rounded-lg p-4 bg-gray-50/50 relative">
                    <button type="button" onClick={() => removeArrayItem('government_portals', i)} className="absolute top-3 right-3 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors cursor-pointer">
                      <TrashIcon className="w-4 h-4" />
                    </button>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pr-8">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Portal Name</label>
                        <select value={portal.portal} onChange={(e) => updateArrayItem('government_portals', i, 'portal', e.target.value)} className={selectClass}>
                          <option value="">Select portal...</option>
                          <option value="SBA.gov">SBA.gov</option>
                          <option value="USASpending.gov">USASpending.gov</option>
                          <option value="FPDS.gov">FPDS.gov</option>
                          <option value="Grants.gov">Grants.gov</option>
                          <option value="Acquisition.gov">Acquisition.gov</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Registration / Entity ID</label>
                        <input type="text" value={portal.registration_id} onChange={(e) => updateArrayItem('government_portals', i, 'registration_id', e.target.value)} placeholder="Your registration ID" className={inputClass} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                        <select value={portal.status} onChange={(e) => updateArrayItem('government_portals', i, 'status', e.target.value)} className={selectClass}>
                          <option value="Registered">Registered</option>
                          <option value="Pending">Pending</option>
                          <option value="Expired">Expired</option>
                          <option value="Not Registered">Not Registered</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Section>

        {/* ─── 7. CONTACT INFORMATION ──────────────────────────── */}
        <Section icon={PhoneIcon} title="Contact Information">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>Contact Name</label>
              <div className="relative">
                <UserCircleIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type="text" value={profile.contact_name} onChange={(e) => handleChange('contact_name', e.target.value)} placeholder="Full name" className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue transition-all" />
              </div>
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <div className="relative">
                <EnvelopeIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type="email" value={profile.contact_email} onChange={(e) => handleChange('contact_email', e.target.value)} placeholder="email@company.com" className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue transition-all" />
              </div>
            </div>
            <div>
              <label className={labelClass}>Phone</label>
              <div className="relative">
                <PhoneIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type="tel" value={profile.contact_phone} onChange={(e) => handleChange('contact_phone', e.target.value)} placeholder="(555) 123-4567" className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue transition-all" />
              </div>
            </div>
            <div>
              <label className={labelClass}>Address</label>
              <div className="relative">
                <MapPinIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type="text" value={profile.contact_address} onChange={(e) => handleChange('contact_address', e.target.value)} placeholder="123 Main St, City, State ZIP" className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue transition-all" />
              </div>
            </div>
          </div>
        </Section>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="bg-accent hover:bg-accent-dark text-white px-8 py-3 rounded-lg font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm hover:shadow-md"
          >
            {saving ? (
              <>
                <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Saving...
              </>
            ) : (
              <>
                <CheckCircleIcon className="w-5 h-5" />
                Save Profile
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
