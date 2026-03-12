import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import OpportunitySearch from './pages/OpportunitySearch';
import VendorProfile from './pages/VendorProfile';
import ProposalGenerator from './pages/ProposalGenerator';
import ProposalEditor from './pages/ProposalEditor';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/opportunities" element={<OpportunitySearch />} />
          <Route path="/vendor-profile" element={<VendorProfile />} />
          <Route path="/new-proposal" element={<ProposalGenerator />} />
          <Route path="/proposal-editor" element={<ProposalEditor />} />
        </Route>
      </Routes>
    </Router>
  );
}
