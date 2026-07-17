import React, { useState } from 'react';
import Layout from '../components/Layout';
import API from '../api/axiosInstance';
import './GSTR1Report.css';

export default function GSTR1Report() {
  const date = new Date();
  const [month, setMonth] = useState(date.getMonth() === 0 ? 12 : date.getMonth());
  const [year, setYear] = useState(date.getMonth() === 0 ? date.getFullYear() - 1 : date.getFullYear());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generateReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await API.get('/reports/gstr1', {
        params: { month, year }
      });
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(response.data, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `GSTR1_${year}_${month}.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
    } catch (err) {
      console.error(err);
      setError('Failed to generate report. Make sure you have sufficient permissions and data exists.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="gstr1-container">
        <h1 className="page-title">GSTR-1 Report Generator</h1>
        <p className="page-subtitle">Generate JSON payloads for direct GST portal upload</p>

        <div className="report-card">
          <div className="form-group">
            <label>Month</label>
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              <option value={1}>January</option>
              <option value={2}>February</option>
              <option value={3}>March</option>
              <option value={4}>April</option>
              <option value={5}>May</option>
              <option value={6}>June</option>
              <option value={7}>July</option>
              <option value={8}>August</option>
              <option value={9}>September</option>
              <option value={10}>October</option>
              <option value={11}>November</option>
              <option value={12}>December</option>
            </select>
          </div>
          
          <div className="form-group">
            <label>Year</label>
            <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button className="primary-btn" onClick={generateReport} disabled={loading}>
            {loading ? 'Generating...' : 'Generate & Download JSON'}
          </button>
        </div>
      </div>
    </Layout>
  );
}
