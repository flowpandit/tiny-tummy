import { DatePicker } from "../ui/date-picker";
import { TimePicker } from "../ui/time-picker";
import { getCurrentLocalDate } from "../../lib/utils";
import { LoggingFieldGroup } from "./logging-form-primitives";

interface LogDateTimeFieldsProps {
  date: string;
  time: string;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
  nightMode: boolean;
}

export function LogDateTimeFields({
  date,
  time,
  onDateChange,
  onTimeChange,
  nightMode,
}: LogDateTimeFieldsProps) {
  return (
    <LoggingFieldGroup label="When" isNight={nightMode}>
      <div className="grid grid-cols-2 gap-2">
        <DatePicker value={date} onChange={onDateChange} max={getCurrentLocalDate()} nightMode={nightMode} />
        <TimePicker value={time} onChange={onTimeChange} nightMode={nightMode} />
      </div>
    </LoggingFieldGroup>
  );
}
