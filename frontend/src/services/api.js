const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/api';

export async function fetchApi(endpoint, options = {}) {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || `API error ${res.status}: ${res.statusText}`);
    }
    return await res.json();
  } catch (err) {
    console.warn(`[NeuroSaathi API] ${endpoint}:`, err.message);
    throw err;
  }
}

export async function loginCaregiver(email, password) {
  return await fetchApi('/auth/caregiver/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
}

export async function registerCaregiver(name, email, password, mobile = '') {
  return await fetchApi('/auth/caregiver/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password, mobile })
  });
}

export async function logoutCaregiver(token) {
  return await fetchApi('/auth/caregiver/logout', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
}

let demoPatients = [
  { id: 'kamla', name: 'Kamla Devi', age: 72, preferred_language: 'Hindi', caregiver_name: 'Priya Sharma', is_demo: true },
  { id: 'rongsen', name: 'Rongsen', age: 69, preferred_language: 'English', caregiver_name: 'Amina', is_demo: true }
];

export async function getPatients() {
  try {
    const res = await fetchApi('/patients');
    return res || demoPatients;
  } catch (e) {
    return demoPatients;
  }
}

export async function getPatient(patientId) {
  try {
    return await fetchApi(`/patients/${patientId}`);
  } catch (e) {
    return demoPatients.find(p => p.id === patientId) || null;
  }
}

export async function createPatient(payload) {
  try {
    return await fetchApi('/patients', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  } catch (e) {
    const newPatient = { id: 'demo-' + Date.now(), ...payload };
    demoPatients.push(newPatient);
    return newPatient;
  }
}

export async function updatePatient(patientId, payload) {
  try {
    return await fetchApi(`/patients/${patientId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  } catch (e) {
    const idx = demoPatients.findIndex(p => p.id === patientId);
    if (idx !== -1) {
      demoPatients[idx] = { ...demoPatients[idx], ...payload };
    }
    return { id: patientId, ...payload };
  }
}

export async function submitActivityResult(payload) {
  try {
    return await fetchApi('/activities/result', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  } catch (e) {
    return null;
  }
}

export async function getPatientActivities(patientId, activityType = 'all', days = null) {
  try {
    let url = `/patients/${patientId}/activities?activity_type=${activityType}`;
    if (days) url += `&days=${days}`;
    const res = await fetchApi(url);
    return res ? res.activities : [];
  } catch (e) {
    return [];
  }
}

export async function getPatientAnalytics(patientId) {
  try {
    return await fetchApi(`/patients/${patientId}/analytics`);
  } catch (e) {
    return null;
  }
}

export async function getPatientRecommendation(patientId) {
  try {
    return await fetchApi(`/patients/${patientId}/recommendation`);
  } catch (e) {
    return null;
  }
}

let demoMemories = {
  kamla: [
    { id: 'mem-1', name: 'Anjali', relationship: 'Daughter', description: 'Lives in Guwahati', photo_url: '👩‍👧' },
    { id: 'mem-2', name: 'Aarav', relationship: 'Grandson', description: 'Loves playing cricket', photo_url: '👦' }
  ],
  rongsen: [
    { id: 'mem-3', name: 'Toshi', relationship: 'Son', description: 'Visits frequently', photo_url: '👨' }
  ]
};

export async function getFamilyMemories(patientId) {
  try {
    const res = await fetchApi(`/patients/${patientId}/family-memories`);
    return res || (demoMemories[patientId] || []);
  } catch (e) {
    return demoMemories[patientId] || [];
  }
}

export async function addFamilyMemory(patientId, payload) {
  try {
    return await fetchApi(`/patients/${patientId}/family-memories`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  } catch (e) {
    const newMem = { id: 'mem-' + Date.now(), ...payload };
    if (!demoMemories[patientId]) demoMemories[patientId] = [];
    demoMemories[patientId].push(newMem);
    return newMem;
  }
}

export async function uploadFamilyMemoryPhoto(patientId, formData) {
  try {
    const res = await fetch(`${API_BASE}/patients/${patientId}/family-memories/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      throw new Error(`Upload failed ${res.status}`);
    }
    return await res.json();
  } catch (e) {
    // Offline simulation
    const name = formData.get('name') || 'Unknown';
    const relationship = formData.get('relationship') || 'Other';
    const description = formData.get('description') || '';
    
    // Default to an emoji if photo can't be uploaded offline
    const fallbackEmoji = relationship.includes('Son') || relationship.includes('Brother') || relationship.includes('Father') ? '👨' 
      : relationship.includes('Daughter') || relationship.includes('Sister') || relationship.includes('Mother') ? '👩' : '🧑';
    
    const newMem = { id: 'mem-' + Date.now(), name, relationship, description, photo_url: fallbackEmoji };
    if (!demoMemories[patientId]) demoMemories[patientId] = [];
    demoMemories[patientId].push(newMem);
    return newMem;
  }
}

export async function deleteFamilyMemory(patientId, memId) {
  try {
    return await fetchApi(`/patients/${patientId}/family-memories/${memId}`, {
      method: 'DELETE',
    });
  } catch (e) {
    if (demoMemories[patientId]) {
      demoMemories[patientId] = demoMemories[patientId].filter(m => m.id !== memId);
    }
    return { status: 'success' };
  }
}

let demoAlerts = {
  kamla: [
    { id: 'al-1', title: 'Accuracy Drop', message: 'Accuracy in Matching game dropped below 50% recently.', reviewed: false },
    { id: 'al-2', title: 'Missed Activity', message: 'Patient did not complete any memory activities yesterday.', reviewed: true }
  ],
  rongsen: []
};

export async function getPatientAlerts(patientId) {
  try {
    const res = await fetchApi(`/patients/${patientId}/alerts`);
    return res || (demoAlerts[patientId] || []);
  } catch (e) {
    return demoAlerts[patientId] || [];
  }
}

export async function reviewAlert(alertId) {
  try {
    return await fetchApi(`/alerts/${alertId}/review`, {
      method: 'POST',
    });
  } catch (e) {
    // Offline simulation
    for (const pId in demoAlerts) {
      const idx = demoAlerts[pId].findIndex(a => a.id === alertId);
      if (idx !== -1) {
        demoAlerts[pId][idx].reviewed = true;
        break;
      }
    }
    return { status: 'success' };
  }
}
