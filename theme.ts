export interface Theme {
    bg: string; surface: string; surfaceAlt: string; text: string; textMuted: string;
    border: string; accent: string; danger: string; success: string; warning: string;
}

export const lightTheme: Theme = {
    bg: '#F7F4EF', surface: '#FFFFFF', surfaceAlt: '#EFEAE2', text: '#1E1B16',
    textMuted: '#7A7268', border: '#E3DCD1', accent: '#3E6B5C',
    danger: '#C24545', success: '#3E6B5C', warning: '#C98A2D',
};

export const darkTheme: Theme = {
    bg: '#14120F', surface: '#1E1B17', surfaceAlt: '#28241F', text: '#F0EBE3',
    textMuted: '#9B9285', border: '#332E27', accent: '#6FA890',
    danger: '#E06C6C', success: '#6FA890', warning: '#E0A54E',
};
