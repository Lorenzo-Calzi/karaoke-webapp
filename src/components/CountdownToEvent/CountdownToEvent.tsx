import Countdown from "react-countdown";
import { getNextEvent } from "../../utils/getNextEvent";
import "./countdownToEvent.scss";

const CountdownToNextEvent = () => {
    const nextEvent = getNextEvent();
    if (!nextEvent) return null;

    const targetDate = new Date(nextEvent.start);

    return (
        <div className="countdown-container">
            <Countdown
                date={targetDate}
                renderer={({ days, hours, minutes, seconds, completed }) => {
                    if (completed) return null;

                    const timeBox = (value: number, label: string) => (
                        <div className="countdown-box">
                            <div className="countdown-value">{String(value).padStart(2, "0")}</div>
                            <div className="countdown-label">{label}</div>
                        </div>
                    );

                    return (
                        <div className="countdown-grid">
                            {timeBox(days, "DAYS")}
                            <div className="countdown-separator">:</div>
                            {timeBox(hours, "HOURS")}
                            <div className="countdown-separator">:</div>
                            {timeBox(minutes, "MINUTES")}
                            <div className="countdown-separator">:</div>
                            {timeBox(seconds, "SECONDS")}
                        </div>
                    );
                }}
            />
        </div>
    );
};

export default CountdownToNextEvent;
