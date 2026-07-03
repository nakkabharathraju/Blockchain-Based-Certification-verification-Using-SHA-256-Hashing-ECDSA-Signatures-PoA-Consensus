const { ethers } = require('ethers');
require('dotenv').config();

// Sepolia Testnet Provider
const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);

// Admin wallet for contract interactions (optional - can use frontend signer)
const wallet = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY, provider);

// CONTRACT ABI (Copy this EXACTLY from Remix after deployment)
const CONTRACT_ABI = [
  "event CertificateIssued(uint256 indexed certId,address admin)",
  "event CertificateRevoked(uint256 indexed certId,address admin)",
  "function certificates(uint256) view returns (string studentName,string course,uint256 marks,string examPaperId,string institutionName,bytes32 dataHash,bytes signature,address adminAddress,string status,uint256 timestamp)",
  "function certCount() view returns (uint256)",
  "function issueCertificate(string _studentName,string _course,uint256 _marks,string _examPaperId,string _institutionName,bytes _signature)",
  "function registerInstitution()",
  "function registeredInstitutions(address) view returns (bool)",
  "function revokeCertificate(uint256 _certId)",
  "function verifyCertificate(uint256 _certId,string _studentName,string _course,uint256 _marks,string _examPaperId,string _institutionName) view returns (string)"
];

// Initialize contract instance
const contract = new ethers.Contract(
  process.env.CONTRACT_ADDRESS, 
  CONTRACT_ABI, 
  wallet
);

// Register institution (call once per admin wallet)
async function registerInstitution(adminAddress) {
  try {
    const tx = await contract.connect(provider.getSigner(adminAddress)).registerInstitution();
    await tx.wait();
    console.log(`✅ Institution registered: ${adminAddress}`);
    return true;
  } catch (error) {
    console.error('Registration failed:', error.message);
    return false;
  }
}

// Issue certificate on blockchain (with REAL signature verification)
async function issueCertificate(data, signature, adminAddress) {
  try {
    console.log('📤 Issuing certificate on blockchain...');
    
    const tx = await contract.connect(provider.getSigner(adminAddress)).issueCertificate(
      data.studentName,
      data.course,
      ethers.parseUnits(data.marks.toString(), 0), // uint256 marks
      data.examPaperId,
      data.institutionName,
      signature // REAL cryptographic signature
    );
    
    const receipt = await tx.wait();
    
    // Extract certId from event logs
    const certId = receipt.logs[0].args.certId.toString();
    
    console.log(`✅ Certificate issued! Tx: ${tx.hash}, Cert ID: ${certId}`);
    return { 
      success: true, 
      txHash: tx.hash, 
      certId: parseInt(certId) 
    };
  } catch (error) {
    console.error('Issue failed:', error.message);
    throw new Error(`Blockchain issuance failed: ${error.message}`);
  }
}

// Verify certificate (public function - no signer needed)
async function verifyCertificate(certId, certData) {
  try {
    const result = await contract.verifyCertificate(
      certId,
      certData.studentName,
      certData.course,
      ethers.parseUnits(certData.marks.toString(), 0),
      certData.examPaperId,
      certData.institutionName
    );
    return result;
  } catch (error) {
    console.error('Verification failed:', error.message);
    throw new Error(`Verification failed: ${error.message}`);
  }
}

// Get certificate details by ID
async function getCertificate(certId) {
  try {
    const cert = await contract.certificates(certId);
    return {
      studentName: cert.studentName,
      course: cert.course,
      marks: cert.marks.toString(),
      examPaperId: cert.examPaperId,
      institutionName: cert.institutionName,
      status: cert.status,
      adminAddress: cert.adminAddress,
      timestamp: cert.timestamp.toString()
    };
  } catch (error) {
    console.error('Get certificate failed:', error.message);
    return null;
  }
}

// Check if institution is registered
async function isInstitutionRegistered(adminAddress) {
  try {
    return await contract.registeredInstitutions(adminAddress);
  } catch (error) {
    console.error('Check registration failed:', error.message);
    return false;
  }
}

// Get total certificates issued
async function getCertCount() {
  try {
    return (await contract.certCount()).toString();
  } catch (error) {
    console.error('Get count failed:', error.message);
    return '0';
  }
}

module.exports = {
  registerInstitution,
  issueCertificate,
  verifyCertificate,
  getCertificate,
  isInstitutionRegistered,
  getCertCount,
  contract,
  provider,
  wallet
};
