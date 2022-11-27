export interface SensorsInfo {
	temeprature: number,
	humidity: number,
	lampStatus: boolean,
	bright: number,
	currentMode: string
}


export function modeNumberToString(mode: number): string {
	switch (mode) {
		case 0:
			return "weather"
		case 1:
			return "fill"
		case 2:
			return "rainbow"
		default:
			return null;
	}
}
