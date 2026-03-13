import { useState, useEffect } from 'react';
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
  company_name: '',
  cage_code: '',
  duns_number: '',
  ein_tin: '',
  naics_codes: [],
  capabilities: '',
  past_performance: '',
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

  // Load saved profile from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('vendorProfile');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Migrate old comma-separated string to array
        if (typeof parsed.naics_codes === 'string') {
          parsed.naics_codes = parsed.naics_codes
            .split(',')
            .map((c) => c.trim())
            .filter(Boolean);
        }
        setProfile({ ...initialProfile, ...parsed });
      } catch {
        // ignore parse errors
      }
    }
  }, []);

  const handleChange = (field, value) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
    setSuccess('');
    setError('');
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
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccess('');
    setError('');

    try {
      // Save to localStorage for local use
      localStorage.setItem('vendorProfile', JSON.stringify(profile));

      // Post to backend
      await api.post('/api/vendor-profile', profile);
      setSuccess('Vendor profile saved successfully.');
    } catch (err) {
      // Even if API fails, local save was successful
      setSuccess('Profile saved locally.');
      console.warn('API save failed:', err.message);
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue transition-all';
  const selectClass = `${inputClass} bg-white`;
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1.5';

  return (
    <div className="max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-navy">Vendor Profile</h1>
        <p className="text-gray-500 mt-1">
          Manage your company information for proposal generation
        </p>
      </div>

      {/* Success/Error Messages */}
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
        {/* Company Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-navy mb-5 flex items-center gap-2">
            <BuildingOffice2Icon className="w-5 h-5" />
            Company Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <label className={labelClass}>
                Company Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={profile.company_name}
                onChange={(e) => handleChange('company_name', e.target.value)}
                placeholder="e.g., Acme Federal Solutions, LLC"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>CAGE Code</label>
              <input
                type="text"
                value={profile.cage_code}
                onChange={(e) => handleChange('cage_code', e.target.value)}
                placeholder="e.g., 5ABC1"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>DUNS/UEI Number</label>
              <input
                type="text"
                value={profile.duns_number}
                onChange={(e) => handleChange('duns_number', e.target.value)}
                placeholder="e.g., 123456789"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>EIN/TIN</label>
              <input
                type="text"
                value={profile.ein_tin}
                onChange={(e) => handleChange('ein_tin', e.target.value)}
                placeholder="e.g., 12-3456789"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Organizational Type</label>
              <select
                value={profile.organizational_type}
                onChange={(e) => handleChange('organizational_type', e.target.value)}
                className={selectClass}
              >
                {orgTypeOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>State of Incorporation</label>
              <input
                type="text"
                value={profile.state_of_incorporation}
                onChange={(e) => handleChange('state_of_incorporation', e.target.value)}
                placeholder="e.g., Virginia"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Socioeconomic Status</label>
              <select
                value={profile.socioeconomic_status}
                onChange={(e) => handleChange('socioeconomic_status', e.target.value)}
                className={selectClass}
              >
                {socioeconomicOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Years in Business</label>
              <input
                type="number"
                min="0"
                value={profile.years_in_business}
                onChange={(e) => handleChange('years_in_business', e.target.value)}
                placeholder="e.g., 10"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Number of Employees</label>
              <input
                type="text"
                value={profile.number_of_employees}
                onChange={(e) => handleChange('number_of_employees', e.target.value)}
                placeholder="e.g., 150"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Annual Revenue</label>
              <input
                type="text"
                value={profile.annual_revenue}
                onChange={(e) => handleChange('annual_revenue', e.target.value)}
                placeholder="e.g., $25M"
                className={inputClass}
              />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>
                NAICS Codes{' '}
                <span className="text-gray-400 font-normal">
                  (select from official 2022 NAICS list)
                </span>
              </label>
              <NaicsCodeSelector
                selectedCodes={profile.naics_codes || []}
                onChange={(codes) => handleChange('naics_codes', codes)}
              />
            </div>
          </div>
        </div>

        {/* SAM.gov Registration & Security */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-navy mb-5 flex items-center gap-2">
            <ShieldCheckIcon className="w-5 h-5" />
            SAM.gov Registration & Security
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>SAM.gov Registration Status</label>
              <select
                value={profile.sam_registration_status}
                onChange={(e) => handleChange('sam_registration_status', e.target.value)}
                className={selectClass}
              >
                {samStatusOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>SAM Expiration Date</label>
              <input
                type="date"
                value={profile.sam_expiration_date}
                onChange={(e) => handleChange('sam_expiration_date', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Facility Security Clearance Level</label>
              <select
                value={profile.security_clearance_level}
                onChange={(e) => handleChange('security_clearance_level', e.target.value)}
                className={selectClass}
              >
                {clearanceLevelOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Certifications & Contract Vehicles */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-navy mb-5 flex items-center gap-2">
            <DocumentCheckIcon className="w-5 h-5" />
            Certifications & Contract Vehicles
          </h2>
          <div className="space-y-5">
            <div>
              <label className={labelClass}>
                Certifications{' '}
                <span className="text-gray-400 font-normal">(select all that apply)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {certificationOptions.map((cert) => {
                  const isSelected = (profile.certifications || []).includes(cert);
                  return (
                    <button
                      key={cert}
                      type="button"
                      onClick={() => toggleArrayItem('certifications', cert)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-navy text-white border-navy'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      {isSelected && '✓ '}
                      {cert}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className={labelClass}>
                Contract Vehicles{' '}
                <span className="text-gray-400 font-normal">(select all that apply)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {contractVehicleOptions.map((cv) => {
                  const isSelected = (profile.contract_vehicles || []).includes(cv);
                  return (
                    <button
                      key={cv}
                      type="button"
                      onClick={() => toggleArrayItem('contract_vehicles', cv)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-accent text-white border-accent'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      {isSelected && '✓ '}
                      {cv}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Capabilities & Past Performance */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-navy mb-5 flex items-center gap-2">
            <BriefcaseIcon className="w-5 h-5" />
            Capabilities & Experience
          </h2>
          <div className="space-y-5">
            <div>
              <label className={labelClass}>Capabilities</label>
              <textarea
                value={profile.capabilities}
                onChange={(e) => handleChange('capabilities', e.target.value)}
                placeholder="Describe your company's core capabilities, services, and areas of expertise..."
                rows={5}
                className={`${inputClass} resize-y`}
              />
            </div>
            <div>
              <label className={labelClass}>Past Performance</label>
              <textarea
                value={profile.past_performance}
                onChange={(e) => handleChange('past_performance', e.target.value)}
                placeholder="List relevant past contracts, performance summaries, and key accomplishments..."
                rows={5}
                className={`${inputClass} resize-y`}
              />
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-navy mb-5 flex items-center gap-2">
            <PhoneIcon className="w-5 h-5" />
            Contact Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>Contact Name</label>
              <div className="relative">
                <UserCircleIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={profile.contact_name}
                  onChange={(e) => handleChange('contact_name', e.target.value)}
                  placeholder="Full name"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue transition-all"
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <div className="relative">
                <EnvelopeIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={profile.contact_email}
                  onChange={(e) => handleChange('contact_email', e.target.value)}
                  placeholder="email@company.com"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue transition-all"
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Phone</label>
              <div className="relative">
                <PhoneIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="tel"
                  value={profile.contact_phone}
                  onChange={(e) => handleChange('contact_phone', e.target.value)}
                  placeholder="(555) 123-4567"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue transition-all"
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Address</label>
              <div className="relative">
                <MapPinIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={profile.contact_address}
                  onChange={(e) => handleChange('contact_address', e.target.value)}
                  placeholder="123 Main St, City, State ZIP"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue transition-all"
                />
              </div>
            </div>
          </div>
        </div>

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
