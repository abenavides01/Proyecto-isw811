import React, { useState, useEffect } from "react";
import "../styles/SchedulePage.css";
import { useNavigate } from "react-router-dom";

const SchedulePage = () => {
  const [schedule, setSchedule] = useState([]);
  const [addingTime, setAddingTime] = useState({ day: null, time: "" });
  const navigate = useNavigate();

  useEffect(() => {
    const userId = sessionStorage.getItem("userId");

    if (!userId) {
      console.error("El userId no está disponible.");
      navigate("/");
      return;
    }

    const fetchSchedules = async () => {
      try {
        const response = await fetch(`/api/schedules/${userId}`);
        if (!response.ok) {
          throw new Error("Error al obtener los horarios");
        }
        const data = await response.json();
        setSchedule(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Error al obtener horarios:", error);
      }
    };

    fetchSchedules();
  }, [navigate]);

  const handleAddTimeClick = (day) => {
    setAddingTime({ day, time: "" });
  };

  const handleTimeChange = (event) => {
    setAddingTime({ ...addingTime, time: event.target.value });
  };

  const handleConfirmAddTime = async () => {
    if (addingTime.time) {
      const userId = sessionStorage.getItem("userId");

      if (!userId) {
        console.error("El userId no está disponible.");
        navigate("/");
        return;
      }

      try {
        const response = await fetch("/api/schedules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            dayOfWeek: addingTime.day,
            time: addingTime.time,
          }),
        });

        if (response.ok) {
          const newSchedule = await response.json();
          setSchedule((prev) => [...prev, newSchedule]);
          setAddingTime({ day: null, time: "" });
        } else {
          alert("Error al agregar horario.");
        }
      } catch (error) {
        console.error("Error al agregar horario:", error);
      }
    }
  };

  const handleRemoveTime = async (scheduleId) => {
    try {
      const response = await fetch(`/api/schedules/${scheduleId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setSchedule((prev) => prev.filter((item) => item.id !== scheduleId));
      } else {
        alert("Error al eliminar horario.");
      }
    } catch (error) {
      console.error("Error al eliminar horario:", error);
    }
  };

  const daysOfWeek = ["L", "K", "M", "J", "V", "S", "D"];

  const maxRows = Math.max(
    ...daysOfWeek.map(
      (day) => schedule.filter((item) => item.day_of_week === day).length
    )
  );

  return (
    <div className="schedule-container">
      <h1>Horarios de publicación</h1>
      <table className="schedule-table">
        <thead>
          <tr>
            <th>Lunes</th>
            <th>Martes</th>
            <th>Miércoles</th>
            <th>Jueves</th>
            <th>Viernes</th>
            <th>Sábado</th>
            <th>Domingo</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: maxRows + 1 }).map((_, rowIndex) => (
            <tr key={rowIndex}>
              {daysOfWeek.map((day, colIndex) => {
                const daySchedules = schedule.filter(
                  (item) => item.day_of_week === day
                );

                if (rowIndex < daySchedules.length) {
                  const scheduleItem = daySchedules[rowIndex];
                  return (
                    <td key={colIndex}>
                      <span
                        className="time-item"
                        onClick={() => handleRemoveTime(scheduleItem.id)}
                      >
                        {scheduleItem.time}
                      </span>
                    </td>
                  );
                }

                if (rowIndex === daySchedules.length && addingTime.day === day) {
                  return (
                    <td key={colIndex}>
                      <div>
                        <input
                          type="time"
                          value={addingTime.time}
                          onChange={handleTimeChange}
                        />
                        <button
                          className="confirm"
                          onClick={handleConfirmAddTime}
                        >
                          ✓
                        </button>
                        <button
                          className="cancel"
                          onClick={() => setAddingTime({ day: null, time: "" })}
                        >
                          ✗
                        </button>
                      </div>
                    </td>
                  );
                }

                if (rowIndex === daySchedules.length) {
                  return (
                    <td key={colIndex}>
                      <button
                        className="add-button"
                        onClick={() => handleAddTimeClick(day)}
                      >
                        +
                      </button>
                    </td>
                  );
                }

                return <td key={colIndex}></td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SchedulePage;
