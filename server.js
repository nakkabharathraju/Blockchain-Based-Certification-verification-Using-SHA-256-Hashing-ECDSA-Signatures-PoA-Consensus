const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static('uploads'));

// Ensure uploads folder
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

// ✅ Simulate issued certificates database (in production = MongoDB)
const issuedCerts = {
  'CERT-1767024399489': {
    studentName: 'Rahul Sharma',
    course: 'B.Tech CSE',
    marks: 90,
    examPaperId: 'CS101-2025-001',
    institutionName: 'Kurukshetra University',
    paperType: 'A4_80gsm_official_watermark',
    institutionLogoHash: 'ku_logo_2025',
    coordinatorSignature: 'Dr. John Doe',
    status: 'VALID',
    issuedHash: 'abc123hash',
    adminAddress: '0xe8053b062de2af24fa205225c991a8fc24785b16'
  }
};

// ✅ ROUTE 1: Institution check
app.get('/api/institution/:address', (req, res) => {
  const { address } = req.params;
  res.json({ 
    registered: address === '0xe8053b062de2af24fa205225c991a8fc24785b16',
    message: 'Institution verification complete'
  });
});

// ✅ ROUTE 2: Certificate issuance
app.post('/api/cert/issue', (req, res) => {
  try {
    let data;
    
    if (req.body.data) {
      data = JSON.parse(req.body.data.toString());
    } else {
      data = {
        studentName: req.body.studentName || 'Test Student',
        course: req.body.course || 'Test Course',
        marks: parseInt(req.body.marks) || 0,
        examPaperId: req.body.examPaperId || 'TEST-001',
        institutionName: req.body.institutionName || 'Test University',
        paperType: req.body.paperType || 'A4_80gsm_official_watermark',
        institutionLogoHash: req.body.institutionLogoHash || 'ku_logo_2025',
        coordinatorSignature: req.body.coordinatorSignature || 'Dr. John Doe',
        signature: req.body.signature || 'test-sig',
        adminAddress: req.body.adminAddress || '0x123'
      };
    }
    
    const certId = `CERT-${Date.now()}`;
    
    // Store in "database" - ✅ ADDED 3 FIELDS
    issuedCerts[certId] = {
      ...data,
      paperType: data.paperType || 'A4_80gsm_official_watermark',
      institutionLogoHash: data.institutionLogoHash || 'ku_logo_2025',
      coordinatorSignature: data.coordinatorSignature || 'Dr. John Doe',
      status: 'VALID',
      issuedHash: 'simulated_blockchain_hash',
      adminAddress: data.adminAddress
    };
    
    console.log('✅ Certificate issued:', certId, data.studentName);
    
    res.json({ certId, message: 'Success!' });
  } catch (error) {
    console.error('Issue error:', error);
    res.status(500).json({ error: 'Failed to issue certificate' });
  }
});

// ✅ ROUTE 3: ENHANCED QR Verification (NEW - Full student details for mobile popup)
app.get('/api/cert/:certId', (req, res) => {
  const { certId } = req.params;
  const cert = issuedCerts[certId];
  
  if (cert) {
    res.json({ 
      valid: true, 
      certId,
      studentName: cert.studentName,
      course: cert.course,
      marks: cert.marks,
      examPaperId: cert.examPaperId,
      institutionName: cert.institutionName,
      paperType: cert.paperType,
      institutionLogoHash: cert.institutionLogoHash,
      coordinatorSignature: cert.coordinatorSignature,
      status: cert.status || 'VALID'
    });
  } else {
    res.json({ valid: false, message: 'Certificate not found' });
  }
});

// ✅ ROUTE 4: Verification endpoint (POST - MAIN VERIFICATION)
app.post('/api/cert/verify', (req, res) => {
  try {
    const { certId, certData } = req.body;
    console.log('🔍 Verifying:', certId, certData.studentName);
    
    // 1. Check if certificate exists
    const issuedCert = issuedCerts[certId];
    if (!issuedCert) {
      return res.json({
        result: '❌ Certificate ID not found in blockchain records',
        status: 'NOT_FOUND',
        details: { certId }
      });
    }
    
    // 2. Check revocation status
    if (issuedCert.status === 'REVOKED') {
      return res.json({
        result: '❌ Certificate REVOKED by issuing institution',
        status: 'REVOKED',
        details: issuedCert
      });
    }
    
    // 3. Tamper detection - ✅ FIXED WITH 3 NEW CHECKS
    const mismatches = [];
    if (certData.studentName !== issuedCert.studentName) mismatches.push('Student Name');
    if (certData.course !== issuedCert.course) mismatches.push('Course');
    if (parseInt(certData.marks) !== issuedCert.marks) mismatches.push('Marks');
    if (certData.examPaperId !== issuedCert.examPaperId) mismatches.push('Exam ID');
    if (certData.institutionName !== issuedCert.institutionName) mismatches.push('Institution');
    
    // ✅ ADDED 3 NEW CHECKS
    if (certData.paperType !== issuedCert.paperType) mismatches.push('Paper Type');
    if (certData.institutionLogoHash !== issuedCert.institutionLogoHash) mismatches.push('Institution Logo');
    if (certData.coordinatorSignature !== issuedCert.coordinatorSignature) mismatches.push('Coordinator Signature');
    
    const isTampered = mismatches.length > 0;
    
    if (isTampered) {
      return res.json({
        result: `❌ CERTIFICATE TAMPERED! ${mismatches.join(', ')} modified`,
        status: 'TAMPERED',
        details: {
          expected: issuedCert,
          submitted: certData,
          mismatches: mismatches
        }
      });
    }
    
    // ✅ ALL CHECKS PASSED
    res.json({
      result: '✅ Certificate verified on blockchain!',
      status: 'VALID',
      details: {
        certId,
        studentName: issuedCert.studentName,
        course: issuedCert.course,
        marks: issuedCert.marks,
        examPaperId: issuedCert.examPaperId,
        institutionName: issuedCert.institutionName,
        paperType: issuedCert.paperType,
        institutionLogoHash: issuedCert.institutionLogoHash,
        coordinatorSignature: issuedCert.coordinatorSignature,
        issuedBy: issuedCert.adminAddress,
        verified: true,
        tamperCheck: 'PASSED ✅'
      }
    });
    
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ 
      result: '❌ Verification server error',
      error: error.message 
    });
  }
});

// ✅ ROUTE 5: Revoke certificate (Institution only)
app.post('/api/cert/revoke', (req, res) => {
  const { certId, adminAddress } = req.body;
  
  if (adminAddress !== '0xe8053b062de2af24fa205225c991a8fc24785b16') {
    return res.status(403).json({ 
      result: '❌ Unauthorized - Only institution can revoke',
      success: false 
    });
  }
  
  if (issuedCerts[certId]) {
    issuedCerts[certId].status = 'REVOKED';
    console.log('🔴 Certificate REVOKED:', certId);
    res.json({ 
      result: `Certificate ${certId} successfully REVOKED`,
      success: true 
    });
  } else {
    res.status(404).json({ result: 'Certificate not found', success: false });
  }
});

app.listen(5000, () => {
  console.log('🚀 Backend running on http://localhost:5000');
  console.log('✅ ROUTES: /api/institution/:addr, /api/cert/issue, /api/cert/verify...');
  console.log('✅ QR ROUTE ENHANCED: Full student details for mobile popup!');
  console.log('✅ Issued certs:', Object.keys(issuedCerts));
});
