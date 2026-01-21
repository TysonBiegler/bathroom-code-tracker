import React, { useState, useEffect } from 'react';
import { MapPin, Plus, Edit2, Trash2, Search, Moon, Sun, Map, List, Navigation, Menu, X } from 'lucide-react';
import './App.css';

export default function BathroomCodeTracker() {
  const [entries, setEntries] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [currentView, setCurrentView] = useState('my-entries');
  const [userLocation, setUserLocation] = useState(null);
  const [nearbyEntries, setNearbyEntries] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [formData, setFormData] = useState({
    businessName: '',
    address: '',
    latitude: null,
    longitude: null,
    maleCode: '',
    femaleCode: ''
  });

  useEffect(() => {
    loadEntries();
    getUserLocation();

    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode) {
      setDarkMode(JSON.parse(savedDarkMode));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    document.body.className = darkMode ? 'dark-mode' : '';
  }, [darkMode]);

  useEffect(() => {
    if (userLocation) {
      loadNearbyEntries();
    }
  }, [userLocation, entries]);

  const loadEntries = () => {
    try {
      const stored = localStorage.getItem('bathroomEntries');
      if (stored) {
        const parsedEntries = JSON.parse(stored);
        setEntries(parsedEntries.sort((a, b) => b.lastUpdated - a.lastUpdated));
      }
    } catch (error) {
      console.log('No existing entries found');
    }
  };

  const saveEntries = (newEntries) => {
    localStorage.setItem('bathroomEntries', JSON.stringify(newEntries));
    setEntries(newEntries.sort((a, b) => b.lastUpdated - a.lastUpdated));
  };

  const getUserLocation = () => {
    if (navigator.geolocation) {
      console.log('Requesting user location...');
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          console.log('User location obtained:', location);
          setUserLocation(location);
        },
        (error) => {
          console.log('Location access error:', error);
        }
      );
    } else {
      console.log('Geolocation not supported');
    }
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 3959;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const loadNearbyEntries = () => {
    if (!userLocation) {
      console.log('No user location available');
      return;
    }

    console.log('Loading nearby entries for location:', userLocation);

    const nearby = entries
      .filter(entry => {
        const hasCoords = entry.latitude && entry.longitude;
        console.log(`Entry ${entry.businessName} has coords:`, hasCoords, entry.latitude, entry.longitude);
        return hasCoords;
      })
      .map(entry => {
        const distance = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          entry.latitude,
          entry.longitude
        );
        console.log(`Distance to ${entry.businessName}:`, distance, 'miles');
        return {
          ...entry,
          distance
        };
      })
      .filter(entry => {
        const isNearby = entry.distance <= 50; // Increased to 50 miles for testing
        console.log(`${entry.businessName} is nearby (within 50mi):`, isNearby);
        return isNearby;
      })
      .sort((a, b) => a.distance - b.distance);

    console.log('Nearby entries found:', nearby.length);
    setNearbyEntries(nearby);
  };

  const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported by your browser'));
        return;
      }

      console.log('Requesting geolocation...');

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          console.log('Got coordinates:', latitude, longitude);

          // First resolve with coordinates, then try geocoding
          const coords = {
            address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
            latitude,
            longitude
          };

          try {
            console.log('Attempting reverse geocoding...');
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
              {
                headers: {
                  'User-Agent': 'BathroomCodeTracker/1.0'
                }
              }
            );

            if (response.ok) {
              const data = await response.json();
              console.log('Geocoding successful:', data.display_name);
              coords.address = data.display_name;
            } else {
              console.log('Geocoding failed, using coordinates');
            }
          } catch (error) {
            console.log('Geocoding error, using coordinates:', error);
          }

          resolve(coords);
        },
        (error) => {
          console.error('Geolocation error:', error);
          let errorMsg = 'Location access denied';

          switch(error.code) {
            case error.PERMISSION_DENIED:
              errorMsg = 'Location permission denied. Please check your browser settings.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMsg = 'Location information unavailable.';
              break;
            case error.TIMEOUT:
              errorMsg = 'Location request timed out.';
              break;
          }

          reject(new Error(errorMsg));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  };

  const handleGetLocation = async () => {
    const button = document.querySelector('.btn-location');

    if (button) {
      const originalHTML = button.innerHTML;
      button.innerHTML = '<span>Getting location...</span>';
      button.disabled = true;

      try {
        console.log('Starting location request...');
        const location = await getCurrentLocation();
        console.log('Location received:', location);

        setFormData(prev => ({
          ...prev,
          address: location.address,
          latitude: location.latitude,
          longitude: location.longitude
        }));

        console.log('Location set in form!');
      } catch (error) {
        console.error('Location error:', error);

        // More helpful error messages
        let userMessage = error.message;
        if (error.message.includes('unavailable')) {
          userMessage = 'Unable to determine your location. This could be because:\n\n' +
                       '• Your device GPS is turned off\n' +
                       '• You\'re indoors with poor signal\n' +
                       '• Location services are disabled\n\n' +
                       'Please enter the address manually or try again when you have better signal.';
        }

        alert(userMessage);
      } finally {
        if (button) {
          button.innerHTML = originalHTML;
          button.disabled = false;
        }
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.businessName || !formData.address) {
      alert('Please fill in business name and address');
      return;
    }

    const now = Date.now();
    const entry = {
      id: editingId || `entry_${now}`,
      businessName: formData.businessName,
      address: formData.address,
      latitude: formData.latitude,
      longitude: formData.longitude,
      maleCode: formData.maleCode,
      femaleCode: formData.femaleCode,
      firstAdded: editingId ? entries.find(e => e.id === editingId)?.firstAdded || now : now,
      lastUpdated: now
    };

    let updatedEntries;
    if (editingId) {
      updatedEntries = entries.map(e => e.id === editingId ? entry : e);
    } else {
      updatedEntries = [...entries, entry];
    }

    saveEntries(updatedEntries);
    setFormData({ businessName: '', address: '', latitude: null, longitude: null, maleCode: '', femaleCode: '' });
    setIsAdding(false);
    setEditingId(null);
  };

  const handleEdit = (entry) => {
    setFormData({
      businessName: entry.businessName,
      address: entry.address,
      latitude: entry.latitude,
      longitude: entry.longitude,
      maleCode: entry.maleCode,
      femaleCode: entry.femaleCode
    });
    setEditingId(entry.id);
    setIsAdding(true);
    setCurrentView('my-entries');
  };

  const handleDelete = (id) => {
    if (!window.confirm('Delete this entry?')) return;

    const updatedEntries = entries.filter(e => e.id !== id);
    saveEntries(updatedEntries);
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const filteredEntries = entries.filter(entry =>
    entry.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group entries by city
  const groupedByCity = filteredEntries.reduce((acc, entry) => {
    // Extract city from address (usually after first comma)
    const addressParts = entry.address.split(',');
    const city = addressParts.length > 1 ? addressParts[1].trim() : 'Unknown';

    if (!acc[city]) {
      acc[city] = [];
    }
    acc[city].push(entry);
    return acc;
  }, {});

  // Sort cities alphabetically
  const sortedCities = Object.keys(groupedByCity).sort();

  const filteredNearbyEntries = nearbyEntries.filter(entry =>
    entry.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const EntryCard = ({ entry, showDistance = false }) => (
    <div className="entry-card">
      <div className="entry-header">
        <div className="entry-title-section">
          <h2>{entry.businessName}</h2>
          {showDistance && entry.distance !== undefined && (
            <p className="distance">
              {entry.distance < 0.1 ? '<0.1' : entry.distance.toFixed(1)} miles away
            </p>
          )}
        </div>
        <div className="entry-actions">
          <button onClick={() => handleEdit(entry)} className="btn-icon btn-edit">
            <Edit2 size={20} />
          </button>
          <button onClick={() => handleDelete(entry.id)} className="btn-icon btn-delete">
            <Trash2 size={20} />
          </button>
        </div>
      </div>

      <div className="address-section">
        <MapPin size={20} />
        <p>{entry.address}</p>
      </div>

      <div className="codes-grid">
        <div className="code-box male-code">
          <p className="code-label">Male Code</p>
          <p className="code-value">{entry.maleCode || 'N/A'}</p>
        </div>
        <div className="code-box female-code">
          <p className="code-label">Female Code</p>
          <p className="code-value">{entry.femaleCode || 'N/A'}</p>
        </div>
      </div>

      <div className="entry-footer">
        <div>
          <span className="label">First Added:</span> {formatDate(entry.firstAdded)}
        </div>
        <div>
          <span className="label">Last Updated:</span> {formatDate(entry.lastUpdated)}
        </div>
      </div>
    </div>
  );

  return (
    <div className="app-container">
      <div className="container">
        <div className="header-card">
          <div className="header-content">
            <div>
              <h1>Bathroom Code Tracker</h1>
              <p className="subtitle">Find and share bathroom access codes</p>
            </div>
            <button onClick={() => setMenuOpen(!menuOpen)} className="btn-menu">
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {menuOpen && (
            <div className="dropdown-menu">
              <button
                onClick={() => {
                  setDarkMode(!darkMode);
                  setMenuOpen(false);
                }}
                className="menu-item"
              >
                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                {darkMode ? 'Light Mode' : 'Dark Mode'}
              </button>
            </div>
          )}

          <div className="view-tabs">
            <button
              onClick={() => setCurrentView('my-entries')}
              className={currentView === 'my-entries' ? 'tab active' : 'tab'}
            >
              <List size={20} />
              My Entries
            </button>
            <button
              onClick={() => setCurrentView('nearby')}
              className={currentView === 'nearby' ? 'tab active' : 'tab'}
            >
              <Map size={20} />
              Nearby ({nearbyEntries.length})
            </button>
          </div>
        </div>

        {!isAdding && (
          <>
            <div className="search-card">
              <div className="search-bar">
                <div className="search-input-wrapper">
                  <Search className="search-icon" size={20} />
                  <input
                    type="text"
                    placeholder="Search by business name or address..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                  />
                </div>
                <button onClick={() => setIsAdding(true)} className="btn-primary">
                  <Plus size={20} />
                  Add Entry
                </button>
              </div>
            </div>

            {currentView === 'nearby' && !userLocation && (
              <div className="empty-state">
                <Navigation size={48} className="empty-icon" />
                <p>Enable location services to see nearby entries</p>
                <button onClick={getUserLocation} className="btn-primary">
                  Enable Location
                </button>
              </div>
            )}

            <div className="entries-list">
              {currentView === 'my-entries' && filteredEntries.length === 0 && (
                <div className="empty-state">
                  <p>No entries yet. Add your first bathroom code!</p>
                </div>
              )}

              {currentView === 'nearby' && userLocation && filteredNearbyEntries.length === 0 && (
                <div className="empty-state">
                  <p>No entries found within 10 miles of your location.</p>
                </div>
              )}

              {currentView === 'my-entries' && filteredEntries.map(entry => (
                <EntryCard key={entry.id} entry={entry} />
              ))}

              {currentView === 'nearby' && userLocation && filteredNearbyEntries.map(entry => (
                <EntryCard key={entry.id} entry={entry} showDistance={true} />
              ))}
            </div>
          </>
        )}

        {isAdding && (
          <div className="form-card">
            <h2>{editingId ? 'Edit Entry' : 'Add New Entry'}</h2>
            <div className="form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Business Name *</label>
                <input
                  type="text"
                  value={formData.businessName}
                  onChange={(e) => setFormData(prev => ({ ...prev, businessName: e.target.value }))}
                  className="input"
                  required
                />
              </div>

              <div className="form-group">
                <label>Address *</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  className="input"
                  required
                />
                <button type="button" onClick={handleGetLocation} className="btn-location">
                  <MapPin size={18} />
                  Use My Location
                </button>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Male Bathroom Code</label>
                  <input
                    type="text"
                    value={formData.maleCode}
                    onChange={(e) => setFormData(prev => ({ ...prev, maleCode: e.target.value }))}
                    className="input"
                  />
                </div>

                <div className="form-group">
                  <label>Female Bathroom Code</label>
                  <input
                    type="text"
                    value={formData.femaleCode}
                    onChange={(e) => setFormData(prev => ({ ...prev, femaleCode: e.target.value }))}
                    className="input"
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="button" onClick={handleSubmit} className="btn-primary btn-full">
                  {editingId ? 'Update Entry' : 'Save Entry'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(false);
                    setEditingId(null);
                    setFormData({ businessName: '', address: '', latitude: null, longitude: null, maleCode: '', femaleCode: '' });
                  }}
                  className="btn-secondary btn-full"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}