import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { ThemeContext } from "../context/ThemeContext";
import api from "../utils/api";
import { logoutUser } from "../utils/auth";

function DoctorDashboard() {
  const navigate = useNavigate();
  const { dark, setDark } = useContext(ThemeContext);

  const [onLeave, setOnLeave] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [doctorInfo, setDoctorInfo] = useState(null);
  const [notesMap, setNotesMap] = useState({});

  const [slots, setSlots] = useState([
    { time: "10:00 - 11:00", available: true },
    { time: "11:00 - 12:00", available: true },
    { time: "12:00 - 01:00", available: false },
  ]);

  const fetchAppointments = async () => {
    try {
      const res = await api.get('/appointments');
      const mappedAppts = res.data.data.map(a => ({
        id: a._id,
        patient: a.patientName,
        date: a.date,
        time: a.time,
        status: a.status,
        prescriptionUrl: a.prescriptionUrl
      }));
      setAppointments(mappedAppts);
    } catch (err) {
      console.error("Failed to fetch appointments:", err);
    }
  };

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr && userStr !== "undefined") {
      setDoctorInfo(JSON.parse(userStr));
    } else {
      localStorage.removeItem('user'); // Clean up corrupt state
    }
    fetchAppointments();
  }, []);

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/appointments/${id}/status`, { status });
      // Instead of locally mapping, refetch to guarantee UI is in sync
      fetchAppointments();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update status");
    }
  };

  const generatePrescription = async (id) => {
    const notes = notesMap[id];
    if (!notes || notes.trim() === '') {
      return alert("Please enter clinical notes and medicines before generating.");
    }
    try {
      await api.post(`/appointments/${id}/generate-prescription`, { notes });
      alert('Official E-Prescription generated successfully! It is now available for the patient.');
      fetchAppointments();
    } catch (err) {
      alert(err.response?.data?.message || "Generation failed");
    }
  };

  const applyLeave = () => {
    setOnLeave(true);
    alert("Leave applied. Your status is now set to 'Away'.");
  };

  return (
    <div style={styles.container}>
      <div style={styles.headerRow}>
        <h2 style={styles.heading}>Medical Practitioner Dashboard</h2>
      </div>

      <div style={styles.grid}>
        <div>
          {/* Profile */}
          <div className="card" style={styles.profileCard}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(13, 148, 136, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>👨‍⚕️</div>
              <div>
                <h3 style={{ margin: 0 }}>{doctorInfo?.name || "Dr. Staff"}</h3>
                <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)' }}>{doctorInfo?.specialization || "General Medicine"}</p>
              </div>
            </div>
            
            <p style={{ margin: '5px 0' }}><strong>Qualification:</strong> {doctorInfo?.qualification || "MBBS, MD"}</p>
            <p style={{ margin: '5px 0' }}><strong>Location:</strong> {doctorInfo?.location || "Main Clinic"}</p>

            <button style={styles.leaveBtn} onClick={applyLeave}>
              Set Out-of-Office Mode
            </button>

            {onLeave && (
              <p style={styles.leaveText}>
                ⚠️ Current Status: On Leave (Bookings Paused)
              </p>
            )}
          </div>

          <div className="card">
            <h3 style={{ marginBottom: '20px' }}>Schedule Management</h3>
            {slots.map((slot, i) => (
              <div key={i} style={styles.slotRow}>
                <span style={{ fontWeight: 600, fontSize: '15px' }}>{slot.time}</span>
                <button
                  style={{
                    ...styles.availabilityBtn,
                    ...(slot.available ? styles.available : styles.unavailable),
                  }}
                  onClick={() =>
                    setSlots(
                      slots.map((s, idx) =>
                        idx === i ? { ...s, available: !s.available } : s
                      )
                    )
                  }
                >
                  {slot.available ? "Active" : "Paused"}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Appointments */}
        <div className="card">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            📅 Active Consultations
          </h3>
          
          {(appointments.length === 0) && (
            <p style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>No active appointments found.</p>
          )}

          {appointments.map((appt) => (
            <div key={appt.id} className="card" style={{ 
              padding: '20px', 
              background: 'var(--nav-bg)', 
              border: '1px solid var(--card-border)', 
              margin: '0 0 20px 0',
              borderLeft: appt.status === 'Accepted' ? '6px solid #0d9488' : '6px solid #f59e0b',
              boxShadow: '0 4px 10px rgba(0,0,0,0.03)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '18px' }}>👤 {appt.patient}</h4>
                  <p style={{ margin: '5px 0', fontSize: '14px', color: 'var(--text-secondary)' }}>
                    <strong>Slot:</strong> {appt.date} | {appt.time}
                  </p>
                </div>
                <div style={{ 
                  padding: '4px 10px', 
                  borderRadius: '20px', 
                  fontSize: '12px', 
                  fontWeight: 'bold',
                  background: appt.status === 'Accepted' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                  color: appt.status === 'Accepted' ? '#10b981' : '#f59e0b'
                }}>
                  {appt.status}
                </div>
              </div>

              {!onLeave && appt.status === "Pending" && (
                <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
                  <button
                    style={{ ...styles.accept, flex: 1 }}
                    onClick={() => updateStatus(appt.id, "Accepted")}
                  >
                    Accept
                  </button>
                  <button
                    style={{ ...styles.reject, flex: 1 }}
                    onClick={() => updateStatus(appt.id, "Rejected")}
                  >
                    Reject
                  </button>
                </div>
              )}

              {appt.status === "Accepted" && !appt.prescriptionUrl && (
                <div style={{ marginTop: '20px', borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '15px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '8px', display: 'block', color: 'var(--text-secondary)' }}>
                    CLINICAL NOTES & MEDICINES:
                  </label>
                  <textarea 
                    placeholder="Example: 
- Paracetamol 500mg (1-0-1) x 5 days
- Bed rest for 2 days
- Increase fluid intake"
                    rows={5}
                    value={notesMap[appt.id] || ''}
                    onChange={(e) => setNotesMap({ ...notesMap, [appt.id]: e.target.value })}
                    style={{ 
                      width: '100%',
                      padding: '12px', 
                      borderRadius: '8px', 
                      border: '1px solid var(--card-border)', 
                      background: 'rgba(0,0,0,0.02)',
                      fontFamily: 'monospace',
                      fontSize: '13px',
                      resize: 'none',
                      marginBottom: '15px'
                    }}
                  />
                  <button 
                    style={{ 
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, #0d9488, #0f766e)',
                      color: 'white',
                      fontWeight: 'bold',
                      border: 'none',
                      cursor: 'pointer',
                      boxShadow: '0 4px 15px rgba(13, 148, 136, 0.3)'
                    }}
                    onClick={() => generatePrescription(appt.id)}
                  >
                    🚀 Generate & Finalize Prescription
                  </button>
                </div>
              )}

              {appt.prescriptionUrl && (
                <div style={{ marginTop: '15px', padding: '12px', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '8px', border: '1px dashed #10b981' }}>
                  <a href={process.env.NODE_ENV === 'production' ? appt.prescriptionUrl : `http://localhost:5001${appt.prescriptionUrl}`} target="_blank" rel="noreferrer" style={{ 
                    color: '#0d9488', 
                    fontWeight: 800, 
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '14px'
                  }}>
                    📄 Official Prescription Generated (View PDF)
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const statusColor = (status) => ({
  color:
    status === "Accepted"
      ? "#15803d"
      : status === "Rejected"
        ? "#b91c1c"
        : "#854d0e",
});

const styles = {
  container: { padding: "40px 6vw", fontFamily: "'Outfit', sans-serif" },
  headerRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "35px" },
  heading: { color: "#0f766e", fontSize: "32px", fontWeight: 800, margin: 0, letterSpacing: "-0.5px" },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "30px", alignItems: "start" },
  profileCard: { display: "flex", flexDirection: "column", gap: "10px", lineHeight: "1.6" },
  leaveBtn: { marginTop: "15px", background: "linear-gradient(135deg, #f59e0b, #d97706)", boxShadow: "0 4px 15px rgba(245, 158, 11, 0.3)" },
  leaveText: { marginTop: "12px", color: "#b91c1c", fontWeight: "600", background: "rgba(254, 226, 226, 0.8)", padding: "10px", borderRadius: 10 },
  slotRow: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px", paddingBottom: "12px", borderBottom: "1px solid rgba(0,0,0,0.05)" },
  availabilityBtn: { padding: "6px 12px", borderRadius: "8px", fontSize: "12px", marginLeft: "10px" },
  available: { background: "linear-gradient(135deg, #10b981, #059669)", boxShadow: "0 4px 10px rgba(16, 185, 129, 0.2)" },
  unavailable: { background: "linear-gradient(135deg, #ef4444, #dc2626)", boxShadow: "0 4px 10px rgba(239, 68, 68, 0.2)" },
  accept: { background: "linear-gradient(135deg, #10b981, #059669)", marginRight: "10px", boxShadow: "0 4px 10px rgba(16, 185, 129, 0.3)" },
  reject: { background: "linear-gradient(135deg, #ef4444, #dc2626)", boxShadow: "0 4px 10px rgba(239, 68, 68, 0.3)" }
};


export default DoctorDashboard;
