import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import IssueCertificate from './components/IssueCertificate';
import VerifyCertificate from './components/VerifyCertificate';
import ImageVerifier from './components/ImageVerifier'; 
import './App.css';

function App() {
  const [account, setAccount] = useState('');
  const [provider, setProvider] = useState(null);
  const [isRegistered, setIsRegistered] = useState(false);

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ 
          method: 'eth_requestAccounts' 
        });
        setAccount(accounts[0]);
        const web3Provider = new ethers.BrowserProvider(window.ethereum);
        setProvider(web3Provider);
        checkRegistration(accounts[0]);
      } catch (error) {
        console.error('Wallet rejected:', error);
      }
    } else {
      alert('Install MetaMask!');
    }
  };

  const checkRegistration = async (addr) => {
    try {
      const response = await fetch(`http://localhost:5000/api/institution/${addr}`);
      if (response.ok) {
        const data = await response.json();
        setIsRegistered(data.registered || false);
      }
    } catch (error) {
      console.log('Backend not running - starting fresh');
      setIsRegistered(false);
    }
  };

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
          setAccount(''); setProvider(null); setIsRegistered(false);
        } else {
          setAccount(accounts[0]);
        }
      });
    }
  }, []);

  return (
    <div className="App">
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <h1>🔗 CertificateChain</h1>
            <span>Decentralized Certificate Verification</span>
          </div>
          <div className="wallet-section">
            {account ? (
              <>
                <span className={`status-badge ${isRegistered ? 'registered' : ''}`}>
                  {isRegistered ? '✅ Registered' : '🚀 Ready to Sign'}
                </span>
                <span>{account.slice(0,6)}...{account.slice(-4)}</span>
              </>
            ) : (
              <span>Connect Wallet</span>
            )}
            <button className="connect-btn" onClick={connectWallet}>
              {account ? '🔄 Reconnect' : 'Connect'}
            </button>
          </div>
        </div>
      </header>

      <main className="main-content">
        <IssueCertificate 
          account={account} 
          provider={provider} 
          isRegistered={true}
        />
        <VerifyCertificate />
        
        {/* ✅ NEW IMAGE VERIFIER */}
        <div style={{ 
          gridColumn: '1 / -1', 
          marginTop: '40px',
          padding: '30px',
          background: 'linear-gradient(135deg, #f8fafc, #e2e8f0)',
          borderRadius: '24px'
        }}>
          <ImageVerifier />
        </div>
      </main>
    </div>
  );
}

export default App;
