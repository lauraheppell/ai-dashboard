import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { DatePicker, Select } from 'antd';
import dayjs from 'dayjs';
import 'antd/dist/reset.css';

const App = () => {
  const [rawData, setRawData] = useState([]);
  const [groupedData, setGroupedData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [roles, setRoles] = useState([]);
  const [dateRange, setDateRange] = useState([null, null]);
  const [selectedRole, setSelectedRole] = useState('All');

  // Function to group data by date and calculate averages
  const groupAndAggregateData = (data) => {
    return Object.values(
      data.reduce((acc, item) => {
        const date = dayjs(item["Date and Time"]).format('YYYY-MM-DD');
        if (!acc[date]) {
          acc[date] = { date, totalEdits: 0, totalSatisfaction: 0, countEdits: 0, countSatisfaction: 0 };
        }

        // Accumulate edits
        if (item["Number of Edits"] && !isNaN(item["Number of Edits"])) {
          acc[date].totalEdits += item["Number of Edits"];
          acc[date].countEdits += 1;
        }

        // Accumulate satisfaction (valid only if numeric)
        if (item["User Satisfaction Rating"] && !isNaN(item["User Satisfaction Rating"])) {
          acc[date].totalSatisfaction += Number(item["User Satisfaction Rating"]);
          acc[date].countSatisfaction += 1;
        }

        return acc;
      }, {})
    ).map((entry) => ({
      date: entry.date,
      avgEdits: entry.countEdits > 0 ? (entry.totalEdits / entry.countEdits).toFixed(2) : null,
      avgSatisfaction: entry.countSatisfaction > 0
        ? (entry.totalSatisfaction / entry.countSatisfaction).toFixed(2)
        : null,
    })).sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  // Fetch data and initialize states
  useEffect(() => {
    fetch('/data.json')
      .then((res) => res.json())
      .then((json) => {
        console.log('Fetched Data:', json);
        setRawData(json);

        // Extract unique roles
        const uniqueRoles = Array.from(new Set(json.map((item) => item['Grouped User Role'])));
        setRoles(['All', ...uniqueRoles]);

        // Group data by date and calculate averages
        const grouped = groupAndAggregateData(json);
        setGroupedData(grouped);
        setFilteredData(grouped);
      })
      .catch((err) => console.error('Error fetching data:', err));
  }, []);

  // Filter data based on date range and role
  const handleFilterChange = () => {
    let filtered = [...rawData];

    // Apply date filter
    if (dateRange[0] && dateRange[1]) {
      filtered = filtered.filter(
        (item) =>
          dayjs(item["Date and Time"]).isAfter(dayjs(dateRange[0])) &&
          dayjs(item["Date and Time"]).isBefore(dayjs(dateRange[1]))
      );
    }

    // Apply role filter
    if (selectedRole !== 'All') {
      filtered = filtered.filter((item) => item['Grouped User Role'] === selectedRole);
    }

    // Group and aggregate filtered data
    const grouped = groupAndAggregateData(filtered);
    setFilteredData(grouped);
  };

  useEffect(handleFilterChange, [dateRange, selectedRole]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100vh', justifyContent: 'center' }}>
      <h1 style={{ textAlign: 'center' }}>AI Tool Performance Dashboard</h1>

      {/* Filters */}
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'center', gap: '10px' }}>
        <DatePicker.RangePicker onChange={(dates) => setDateRange(dates)} />
        <Select
          style={{ width: '200px' }}
          onChange={(value) => setSelectedRole(value)}
          defaultValue="All"
        >
          {roles.map((role) => (
            <Select.Option key={role} value={role}>
              {role}
            </Select.Option>
          ))}
        </Select>
      </div>

      {/* Dual-axis graph: Average satisfaction and edits over time */}
      <LineChart width={800} height={400} data={filteredData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tickFormatter={(tick) => dayjs(tick).format('MM/DD/YYYY')}
        />
        <YAxis
          yAxisId="left"
          label={{ value: 'Satisfaction', angle: -90, position: 'insideLeft' }}
          domain={[0, 5]} // Fixed scale for satisfaction
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          label={{ value: 'Edits', angle: 90, position: 'insideRight' }}
        />
        <Tooltip />
        <Legend />
        <Line yAxisId="left" type="monotone" dataKey="avgSatisfaction" stroke="#8884d8" name="Average Satisfaction" />
        <Line yAxisId="right" type="monotone" dataKey="avgEdits" stroke="#82ca9d" name="Average Edits" />
      </LineChart>
    </div>
  );
};

export default App;
