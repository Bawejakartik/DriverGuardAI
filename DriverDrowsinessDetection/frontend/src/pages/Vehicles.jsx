import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { carApi, apiErrorMessage } from "../api/client";
import Spinner from "../components/Spinner";

const FUEL_TYPES = ["Petrol", "Diesel", "Electric", "Hybrid"];
const EMPTY_FORM = { carName: "", brand: "", model: "", numberPlate: "", fuelType: "Petrol" };

export default function Vehicles() {
  const navigate = useNavigate();
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadCars = async () => {
    setLoading(true);
    try {
      const res = await carApi.list();
      setCars(res.data.cars || []);
      setError("");
    } catch (err) {
      setError(apiErrorMessage(err, "Could not load your vehicles"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      await loadCars();
    })();
  }, []);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onAddCar = async (e) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);
    try {
      await carApi.add(form);
      setForm(EMPTY_FORM);
      setShowForm(false);
      await loadCars();
    } catch (err) {
      setFormError(apiErrorMessage(err, "Could not add vehicle"));
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await carApi.remove(deleteTarget._id);
      setDeleteTarget(null);
      await loadCars();
    } catch (err) {
      setError(apiErrorMessage(err, "Could not delete vehicle"));
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Vehicles</h2>
          <p>Manage the vehicles linked to your account</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancel" : "+ Add Vehicle"}
        </button>
      </div>

      {error && <div className="banner banner-error">{error}</div>}

      {showForm && (
        <div className="card card-pad" style={{ marginBottom: "20px" }}>
          {formError && <div className="banner banner-error">{formError}</div>}
          <form onSubmit={onAddCar}>
            <div className="field-row">
              <div className="field">
                <label>Vehicle nickname</label>
                <input name="carName" required value={form.carName} onChange={onChange} placeholder="My Daily Driver" />
              </div>
              <div className="field">
                <label>Brand</label>
                <input name="brand" required value={form.brand} onChange={onChange} placeholder="Toyota" />
              </div>
            </div>

            <div className="field-row">
              <div className="field">
                <label>Model</label>
                <input name="model" required value={form.model} onChange={onChange} placeholder="Fortuner" />
              </div>
              <div className="field">
                <label>Number plate</label>
                <input name="numberPlate" required value={form.numberPlate} onChange={onChange} placeholder="RJ14AB1234" />
              </div>
            </div>

            <div className="field">
              <label>Fuel type</label>
              <select name="fuelType" value={form.fuelType} onChange={onChange}>
                {FUEL_TYPES.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            <button className="btn btn-primary" type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Save Vehicle"}
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <Spinner label="Loading vehicles..." />
      ) : cars.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">🚘</div>
            No vehicles yet. Add your first vehicle to start a driving session.
          </div>
        </div>
      ) : (
        <div className="vehicle-grid">
          {cars.map((car) => (
            <div className="card vehicle-card" key={car._id}>
              <h4>{car.carName}</h4>
              <p>
                {car.brand} {car.model} · {car.fuelType}
              </p>
              <span className="vehicle-plate">{car.numberPlate}</span>
              <div className="vehicle-actions">
                <button className="btn btn-primary" style={{ padding: "7px 12px", fontSize: "12px" }} onClick={() => navigate(`/drive?carId=${car._id}`)}>
                  Start Drive
                </button>
                <button className="icon-btn" onClick={() => setDeleteTarget(car)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {deleteTarget && (
        <div className="modal-backdrop" onClick={() => !deleting && setDeleteTarget(null)}>
          <div className="card modal" onClick={(e) => e.stopPropagation()}>
            <h3>Delete {deleteTarget.carName}?</h3>
            <p style={{ color: "var(--text-dim)", fontSize: "13px" }}>
              This will remove the vehicle ({deleteTarget.numberPlate}) from your account. This cannot be undone.
            </p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={confirmDelete} disabled={deleting}>
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
