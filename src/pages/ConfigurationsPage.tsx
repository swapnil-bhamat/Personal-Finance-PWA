import { Container, Tabs, Tab } from 'react-bootstrap';
import {
  BsPeople,
  BsBank,
  BsLayersHalf,
  BsLayers,
  BsFlag,
  BsBucket,
  BsGraphUp,
  BsFileEarmarkText,
} from "react-icons/bs";
import HoldersPage from './HoldersPage';
import AccountsPage from './AccountsPage';
import AssetClassesPage from './AssetClassesPage';
import AssetSubClassesPage from './AssetSubClassesPage';
import AssetPurposePage from './AssetPurposePage';
import BucketsPage from './BucketsPage';
import SipTypesPage from './SipTypesPage';
import LoanTypesPage from './LoanTypesPage';

export default function ConfigurationsPage() {
  return (
    <Container fluid className="py-4 overflow-auto h-100">
      <h2 className="mb-4">Configurations</h2>
      <Tabs
        defaultActiveKey="holders"
        id="configuration-tabs"
        className="mb-4 scrollable-tabs"
        fill
      >
        <Tab 
          eventKey="holders" 
          title={<><BsPeople className="me-2"/>Family Members</>}
        >
          <HoldersPage />
        </Tab>
        <Tab 
          eventKey="accounts" 
          title={<><BsBank className="me-2"/>Accounts</>}
        >
          <AccountsPage />
        </Tab>
        <Tab 
          eventKey="asset-classes" 
          title={<><BsLayersHalf className="me-2"/>Asset Types</>}
        >
          <AssetClassesPage />
        </Tab>
        <Tab 
          eventKey="asset-sub-classes" 
          title={<><BsLayers className="me-2"/>Asset Sub Types</>}
        >
          <AssetSubClassesPage />
        </Tab>
        <Tab 
          eventKey="asset-purpose" 
          title={<><BsFlag className="me-2"/>Asset Purpose</>}
        >
          <AssetPurposePage />
        </Tab>
        <Tab 
          eventKey="buckets" 
          title={<><BsBucket className="me-2"/>Asset Buckets</>}
        >
          <BucketsPage />
        </Tab>
        <Tab 
          eventKey="sip-types" 
          title={<><BsGraphUp className="me-2"/>SIP Types</>}
        >
          <SipTypesPage />
        </Tab>
        <Tab 
          eventKey="loan-types" 
          title={<><BsFileEarmarkText className="me-2"/>Loan Types</>}
        >
          <LoanTypesPage />
        </Tab>
      </Tabs>
    </Container>
  );
}
