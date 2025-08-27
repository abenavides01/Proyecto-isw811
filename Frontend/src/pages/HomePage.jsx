import { useNavigate } from "react-router-dom";
import '../styles/HomePage.css';

const HomePage = () => {
    const navigate = useNavigate();

    const handleClickLogout = () => {
        sessionStorage.clear();
        localStorage.clear();
        navigate("/");
    };

    const handleClickDashboard = () => {
        navigate("/dashboard");
    };

    const handleClickAccountConfig = () => {
        navigate("/account-config");
    };

    return (
        <div>
            <div className="container-logout">
                <button onClick={handleClickLogout}>Cerrar Sesión</button>
            </div>
            <h1>
                Bienvenido, {sessionStorage.getItem("username")}
            </h1>
            <div className="grid-buttons-container">
                <button onClick={handleClickDashboard} className="grid-button">
                    <img src="/images/tablero.png" alt="Dashboard" className="button-icon" />
                    Dashboard
                </button>
                <button onClick={handleClickAccountConfig} className="grid-button">
                    <img src="/images/configuraciones.png" alt="Settings" className="button-icon" />
                    Configuración cuentas
                </button>
            </div>
        </div>
    );
};

export default HomePage;
