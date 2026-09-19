"use client";
import { useOutlet } from "./OutletContext";

interface OutletSelectorProps {
  compact?: boolean;
}

export default function OutletSelector({ compact = false }: OutletSelectorProps) {
  const { activeOutlet, setOutlet, outlets, loading } = useOutlet();

  if (loading && outlets.length === 0) {
    return (
      <div className="outlet-selector-wrapper">
        <div className="outlet-dropdown-container">
          <div className="outlet-select-loading">Loading outlets...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`outlet-selector-wrapper ${compact ? "compact" : ""}`}>
      <div className="outlet-selector-label">
        <span>FACILITY / OUTLET</span>
      </div>
      <div className="outlet-dropdown-container">
        <select
          value={activeOutlet?.id || ""}
          onChange={(e) => setOutlet(e.target.value)}
          className="outlet-select-input"
          aria-label="Select Outlet"
        >
          {outlets.map((outlet) => (
            <option key={outlet.id} value={outlet.id}>
              {outlet.icon} {outlet.name} {outlet.code ? `(${outlet.code})` : ""}
            </option>
          ))}
        </select>
        <div className="outlet-dropdown-chevron">▾</div>
      </div>
    </div>
  );
}
