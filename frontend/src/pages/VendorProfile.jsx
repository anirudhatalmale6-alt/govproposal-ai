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
  PlusIcon,
  TrashIcon,
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
  business_registration_date: '',
  naics_codes: [],
  business_classifications: [],
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

  const addBranch = () => {
    setProfile((prev) => ({
      ...prev,
      branches: [...(prev.branches || []), { name: '', line1: '', line2: '', city: '', state: '', zip: '', country: '' }],
    }));
    setSuccess('');
    setError('');
  };

  const updateBranch = (index, field, value) => {
    setProfile((prev) => {
      const branches = [...(prev.branches || [])];
      branches[index] = { ...branches[index], [field]: value };
      return { ...prev, branches };
    });
    setSuccess('');
    setError('');
  };

  const removeBranch = (index) => {
    setProfile((prev) => ({
      ...prev,
      branches: (prev.branches || []).filter((_, i) => i !== index),
    }));
    setSuccess('');
    setError('');
  };

  const addPortal = () => {
    setProfile((prev) => ({
      ...prev,
      government_portals: [...(prev.government_portals || []), { portal: '', registration_id: '', status: 'Registered' }],
    }));
    setSuccess('');
    setError('');
  };

  const updatePortal = (index, field, value) => {
    setProfile((prev) => {
      const portals = [...(prev.government_portals || [])];
      portals[index] = { ...portals[index], [field]: value };
      return { ...prev, government_portals: portals };
    });
    setSuccess('');
    setError('');
  };

  const removePortal = (index) => {
    setProfile((prev) => ({
      ...prev,
      government_portals: (prev.government_portals || []).filter((_, i) => i !== index),
    }));
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
              <label className={labelClass}>Business Registration / Incorporation Date</label>
              <input
                type="date"
                value={profile.business_registration_date}
                onChange={(e) => handleChange('business_registration_date', e.target.value)}
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
                NAICS / SIC Code{' '}
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

        {/* Business Classification */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-navy mb-5 flex items-center gap-2">
            <ShieldCheckIcon className="w-5 h-5" />
            Business Classification
          </h2>
          <div>
            <label className={labelClass}>
              Select all classifications that apply to your business
            </label>
            <div className="flex flex-wrap gap-2">
              {classificationOptions.map((cls) => {
                const isSelected = (profile.business_classifications || []).includes(cls);
                return (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => toggleArrayItem('business_classifications', cls)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-navy text-white border-navy'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    {isSelected && '✓ '}
                    {cls}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Registered Address & Branch Offices */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-navy mb-5 flex items-center gap-2">
            <MapPinIcon className="w-5 h-5" />
            Registered Address & Branch Offices
          </h2>
          <div className="space-y-5">
            <div>
              <label className={labelClass}>
                Registered / Headquarters Address
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <input
                    type="text"
                    value={profile.registered_address_line1}
                    onChange={(e) => handleChange('registered_address_line1', e.target.value)}
                    placeholder="Address Line 1"
                    className={inputClass}
                  />
                </div>
                <div className="md:col-span-2">
                  <input
                    type="text"
                    value={profile.registered_address_line2}
                    onChange={(e) => handleChange('registered_address_line2', e.target.value)}
                    placeholder="Address Line 2 (optional)"
                    className={inputClass}
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={profile.registered_address_city}
                    onChange={(e) => handleChange('registered_address_city', e.target.value)}
                    placeholder="City"
                    className={inputClass}
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={profile.registered_address_state}
                    onChange={(e) => handleChange('registered_address_state', e.target.value)}
                    placeholder="State"
                    className={inputClass}
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={profile.registered_address_zip}
                    onChange={(e) => handleChange('registered_address_zip', e.target.value)}
                    placeholder="Zip Code"
                    className={inputClass}
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={profile.registered_address_country}
                    onChange={(e) => handleChange('registered_address_country', e.target.value)}
                    placeholder="Country"
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className={labelClass + ' mb-0'}>
                  Branch Offices{' '}
                  <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <button
                  type="button"
                  onClick={addBranch}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-navy bg-navy/5 hover:bg-navy/10 rounded-lg transition-colors cursor-pointer"
                >
                  <PlusIcon className="w-3.5 h-3.5" />
                  Add Branch
                </button>
              </div>
              {(profile.branches || []).length === 0 ? (
                <p className="text-sm text-gray-400 italic">
                  No branch offices added. Click "Add Branch" to add one.
                </p>
              ) : (
                <div className="space-y-3">
                  {(profile.branches || []).map((branch, index) => (
                    <div
                      key={index}
                      className="border border-gray-200 rounded-lg p-4 bg-gray-50/50 relative"
                    >
                      <button
                        type="button"
                        onClick={() => removeBranch(index)}
                        className="absolute top-3 right-3 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors cursor-pointer"
                        title="Remove branch"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pr-8">
                        <div className="md:col-span-2">
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            Branch Name
                          </label>
                          <input
                            type="text"
                            value={branch.name}
                            onChange={(e) => updateBranch(index, 'name', e.target.value)}
                            placeholder="e.g., West Coast Office"
                            className={inputClass}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            Address Line 1
                          </label>
                          <input
                            type="text"
                            value={branch.line1 || ''}
                            onChange={(e) => updateBranch(index, 'line1', e.target.value)}
                            placeholder="Address Line 1"
                            className={inputClass}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            Address Line 2
                          </label>
                          <input
                            type="text"
                            value={branch.line2 || ''}
                            onChange={(e) => updateBranch(index, 'line2', e.target.value)}
                            placeholder="Address Line 2 (optional)"
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            City
                          </label>
                          <input
                            type="text"
                            value={branch.city || ''}
                            onChange={(e) => updateBranch(index, 'city', e.target.value)}
                            placeholder="City"
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            State
                          </label>
                          <input
                            type="text"
                            value={branch.state || ''}
                            onChange={(e) => updateBranch(index, 'state', e.target.value)}
                            placeholder="State"
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            Zip Code
                          </label>
                          <input
                            type="text"
                            value={branch.zip || ''}
                            onChange={(e) => updateBranch(index, 'zip', e.target.value)}
                            placeholder="Zip Code"
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            Country
                          </label>
                          <input
                            type="text"
                            value={branch.country || ''}
                            onChange={(e) => updateBranch(index, 'country', e.target.value)}
                            placeholder="Country"
                            className={inputClass}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
            <div>
              <label className={labelClass}>SAM.gov User ID</label>
              <input
                type="text"
                value={profile.sam_login_user}
                onChange={(e) => handleChange('sam_login_user', e.target.value)}
                placeholder="Your SAM.gov login username"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>SAM.gov Password</label>
              <input
                type="password"
                value={profile.sam_login_password}
                onChange={(e) => handleChange('sam_login_password', e.target.value)}
                placeholder="Your SAM.gov login password"
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Government Portal Registrations */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-navy mb-5 flex items-center gap-2">
            <BuildingOffice2Icon className="w-5 h-5" />
            Government Portal Registrations
          </h2>
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className={labelClass + ' mb-0'}>
                Portals{' '}
                <span className="text-gray-400 font-normal">
                  (SAM.gov, SBA.gov, USASpending.gov, FPDS.gov, Grants.gov, Acquisition.gov, etc.)
                </span>
              </label>
              <button
                type="button"
                onClick={addPortal}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-navy bg-navy/5 hover:bg-navy/10 rounded-lg transition-colors cursor-pointer"
              >
                <PlusIcon className="w-3.5 h-3.5" />
                Add Portal
              </button>
            </div>
            {(profile.government_portals || []).length === 0 ? (
              <p className="text-sm text-gray-400 italic">
                No government portals added. Click "Add Portal" to add your registrations.
              </p>
            ) : (
              <div className="space-y-3">
                {(profile.government_portals || []).map((portal, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-lg p-4 bg-gray-50/50 relative"
                  >
                    <button
                      type="button"
                      onClick={() => removePortal(index)}
                      className="absolute top-3 right-3 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors cursor-pointer"
                      title="Remove portal"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pr-8">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Portal Name
                        </label>
                        <select
                          value={portal.portal}
                          onChange={(e) => updatePortal(index, 'portal', e.target.value)}
                          className={selectClass}
                        >
                          <option value="">Select portal...</option>
                          <option value="SAM.gov">SAM.gov</option>
                          <option value="SBA.gov">SBA.gov</option>
                          <option value="USASpending.gov">USASpending.gov</option>
                          <option value="FPDS.gov">FPDS.gov</option>
                          <option value="Grants.gov">Grants.gov</option>
                          <option value="Acquisition.gov">Acquisition.gov</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Registration / Entity ID
                        </label>
                        <input
                          type="text"
                          value={portal.registration_id}
                          onChange={(e) => updatePortal(index, 'registration_id', e.target.value)}
                          placeholder="Your registration ID"
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Status
                        </label>
                        <select
                          value={portal.status}
                          onChange={(e) => updatePortal(index, 'status', e.target.value)}
                          className={selectClass}
                        >
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
