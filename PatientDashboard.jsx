import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useContext } from "react";
import { ThemeContext } from "../context/ThemeContext";
import api from "../utils/api";

function PatientDashboard() {
  const navigate = useNavigate();
  const { dark, setDark } = useContext(ThemeContext);

  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [bookedSlots, setBookedSlots] = useState([]);
  const [freeSlots, setFreeSlots] = useState([]);

  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  const fetchDashboardData = async () => {
    try {
      const [docsRes, apptsRes] = await Promise.all([
        api.get('/doctors'),
        api.get('/appointments')
      ]);
      setDoctors(docsRes.data.data);

      // The backend returns appointments with populated doctorId.name
      // We map it to match our frontend 'doctor' string expectation
      const mappedAppts = apptsRes.data.data.map(a => ({
        id: a._id,
        doctorId: a.doctorId?._id || a.doctorId,
        doctor: a.doctorId?.name || "Unknown Doctor",
        date: a.date,
        time: a.time,
        status: a.status,
        prescriptionUrl: a.prescriptionUrl
      }));
      setAppointments(mappedAppts);
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (selectedDoctor) {
      api.get(`/appointments/doctor/${selectedDoctor}/booked`)
        .then(res => setBookedSlots(res.data.data))
        .catch(err => console.error(err));
    } else {
      setBookedSlots([]);
      setTime("");
    }
  }, [selectedDoctor]);

  const formatTime = (t) => {
    if (!t) return "";
    if (t.toLowerCase().includes('am') || t.toLowerCase().includes('pm')) return t;
    const p = t.split(':');
    if (p.length < 2) return t;
    const h = parseInt(p[0], 10);
    const m = p[1];
    const ampm = h >= 12 ? 'PM' : 'AM';
    const fh = h % 12 || 12;
    return `${fh.toString().padStart(2, '0')}:${m} ${ampm}`;
  };

  useEffect(() => {
    if (selectedDoctor && date) {
      const doc = doctors.find(d => d._id === selectedDoctor);
      if (doc) {
        const timings = (doc.availableTimings && doc.availableTimings.length > 0) 
            ? doc.availableTimings 
            : ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00'];
        const slotsForDate = bookedSlots.filter(s => s.date === date).map(s => formatTime(s.time));
        const available = timings.filter(t => !slotsForDate.includes(formatTime(t)));
        setFreeSlots(available);
      } else {
        setFreeSlots([]);
      }
    } else {
      setFreeSlots([]);
    }
  }, [selectedDoctor, date, bookedSlots, doctors]);

  const bookAppointment = async () => {
    if (!selectedDoctor || !date || !time) {
      alert("Please fill all fields");
      return;
    }

    try {
      await api.post('/appointments', {
        doctorId: selectedDoctor, // using the raw ID from the select value
        date,
        time
      });

      alert("Appointment booked successfully!");
      setSelectedDoctor("");
      setDate("");
      setTime("");
      fetchDashboardData(); // Refresh the list
    } catch (err) {
      alert(err.response?.data?.message || "Failed to book appointment");
    }
  };

  const handleRateDoctor = async (doctorId, rating) => {
    try {
      if (!rating) return alert("Please select a rating!");
      await api.post(`/doctors/${doctorId}/rate`, { rating });
      alert("Thanks! Your rating gives the doctor a good name and increases competition.");
      fetchDashboardData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to submit rating.");
    }
  };

  const todayLocal = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0];

  const upcomingAppts = appointments.filter(a => 
    (a.date >= todayLocal) && 
    (a.status === 'Pending' || a.status === 'Accepted')
  );

  const pastAppts = appointments.filter(a => 
    (a.date < todayLocal) || 
    (a.status === 'Completed' || a.status === 'Rejected' || a.status === 'Cancelled by Admin')
  );

  return (
    <div style={styles.container}>
      <div style={styles.headerRow}>
        <h2 style={styles.heading}>Patient Dashboard</h2>
      </div>

      <div style={styles.grid}>
        {/* Book Appointment */}
        <div className="card" style={styles.card}>
          <h3>Book Appointment</h3>
          <select
            value={selectedDoctor}
            onChange={(e) => setSelectedDoctor(e.target.value)}
          >
            <option value="">Select Doctor</option>
            {doctors.map((doc) => (
              <option key={doc._id} value={doc._id}>
                {doc.name} - {doc.specialization} (⭐ {doc.averageRating > 0 ? `Rating: ${doc.averageRating}` : 'New - Unrated'})
              </option>
            ))}
          </select>

          <input
            type="date"
            value={date}
            onChange={(e) => { setDate(e.target.value); setTime(""); }}
          />

          {selectedDoctor && date ? (
            freeSlots.length > 0 ? (
              <div style={{ background: 'var(--nav-bg)', padding: '15px', borderRadius: '8px', fontSize: '14px', border: '1px solid #10b981' }}>
                <p style={{ color: '#10b981', fontWeight: 'bold', margin: '0 0 10px 0' }}>✓ Available Slots ({date}):</p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {freeSlots.map((slot, i) => (
                    <button 
                      key={i} 
                      onClick={() => setTime(slot)}
                      style={{ 
                        padding: '6px 12px', 
                        borderRadius: '6px', 
                        fontSize: '13px',
                        background: time === slot ? '#0d9488' : 'rgba(13, 148, 136, 0.1)', 
                        color: time === slot ? 'white' : '#0f766e',
                        border: 'none',
                        boxShadow: 'none',
                        transform: 'none'
                      }}>
                      {formatTime(slot)}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ background: 'var(--nav-bg)', padding: '15px', borderRadius: '8px', fontSize: '14px', border: '1px solid #ef4444' }}>
                <p style={{ color: '#ef4444', fontWeight: 'bold', margin: 0 }}>⚠️ No slots available on this date. Please select another date.</p>
              </div>
            )
          ) : selectedDoctor ? (
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Select a date to view available timings.</p>
          ) : null}

          {time && (
            <div style={{ padding: '10px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', borderRadius: '6px', fontSize: '14px', fontWeight: 'bold' }}>
              Selected Time: {formatTime(time)}
            </div>
          )}

          <button style={styles.bookBtn} onClick={bookAppointment}>
            Book Appointment
          </button>
        </div>

        {/* My Appointments */}
        <div className="card" style={styles.card}>
          <h3>My Appointments</h3>
          {appointments.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>No appointments yet</p>}

          {upcomingAppts.length > 0 && (
            <h4 style={{ marginTop: '10px', color: 'var(--text-primary)' }}>Upcoming</h4>
          )}
          {upcomingAppts.map((appt, index) => (
            <div key={index} className="card" style={{ padding: '15px', background: 'var(--nav-bg)', border: '1px solid var(--card-border)', margin: '0 0 10px 0' }}>
              <p style={{ margin: '0 0 5px 0' }}><strong>Doctor:</strong> {appt.doctor}</p>
              <p style={{ margin: '0 0 5px 0' }}><strong>Date:</strong> {appt.date}</p>
              <p style={{ margin: '0 0 5px 0' }}><strong>Time:</strong> {formatTime(appt.time)}</p>
              <p style={{ margin: 0 }}><strong>Status:</strong> <span style={{ color: '#0d9488' }}>{appt.status}</span></p>
            </div>
          ))}

          {pastAppts.length > 0 && (
            <h4 style={{ marginTop: '20px', color: 'var(--text-primary)' }}>Past Appointments</h4>
          )}
          {pastAppts.map((appt, index) => (
            <div key={index} className="card" style={{ padding: '15px', background: 'var(--nav-bg)', border: '1px solid var(--card-border)', margin: '0 0 10px 0', opacity: 0.7 }}>
              <p style={{ margin: '0 0 5px 0' }}><strong>Doctor:</strong> {appt.doctor}</p>
              <p style={{ margin: '0 0 5px 0' }}><strong>Date:</strong> {appt.date}</p>
              <p style={{ margin: '0 0 5px 0' }}><strong>Time:</strong> {formatTime(appt.time)}</p>
              <p style={{ margin: 0 }}><strong>Status:</strong> <span style={{ color: '#0d9488' }}>{appt.status}</span></p>

              {appt.prescriptionUrl && (
                <p style={{ marginTop: '10px' }}>
                  <a href={process.env.NODE_ENV === 'production' ? appt.prescriptionUrl : `http://localhost:5001${appt.prescriptionUrl}`} download target="_blank" rel="noreferrer" style={{ color: '#0f766e', fontWeight: 600, textDecoration: 'none' }}>
                    ⬇️ Download Prescription
                  </a>
                </p>
              )}
              {appt.status === 'Completed' && (
                <div style={{ marginTop: '15px', borderTop: '1px solid var(--card-border)', paddingTop: '10px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 'bold' }}>Rate your experience:</span>
                  <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
                    <select id={`rating-${appt.id}`} style={{ padding: '6px', fontSize: '13px', width: 'auto' }}>
                      <option value="">Select ⭐</option>
                      <option value="5">⭐⭐⭐⭐⭐ Excellent</option>
                      <option value="4">⭐⭐⭐⭐ Good</option>
                      <option value="3">⭐⭐⭐ Average</option>
                      <option value="2">⭐⭐ Poor</option>
                      <option value="1">⭐ Terrible</option>
                    </select>
                    <button style={{ padding: '5px 12px', fontSize: '12px' }} onClick={() => handleRateDoctor(appt.doctorId, document.getElementById(`rating-${appt.id}`).value)}>
                      Submit Review
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: "40px 6vw",
    fontFamily: "'Outfit', sans-serif"
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "35px"
  },
  heading: {
    color: "#0f766e",
    fontSize: "32px",
    fontWeight: 800,
    margin: 0,
    letterSpacing: "-0.5px"
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "30px",
    alignItems: "start"
  },
  card: {
    display: "flex",
    flexDirection: "column",
    gap: "10px"
  },
  bookBtn: {
    marginTop: "10px"
  }
};

export default PatientDashboard;
