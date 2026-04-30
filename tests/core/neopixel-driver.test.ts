import { describe, expect, it, vi } from 'vitest';

import RPi3Driver from '../../src/rpi-drivers/rpi3-driver.js';
import RPi4Driver from '../../src/rpi-drivers/rpi4-driver.js';

describe('RPi NeoPixel color conversion', () => {
    it('RPi3Driver parses bare RGB hex correctly', async () => {
        const driver = new RPi3Driver() as unknown as {
            neopixelLed: { render: ReturnType<typeof vi.fn> };
            useGRBFormat: boolean;
            renderLEDNeopixel: (hexColor: string) => Promise<void>;
        };

        driver.neopixelLed = { render: vi.fn().mockResolvedValue(undefined) };
        driver.useGRBFormat = false;

        await driver.renderLEDNeopixel('FF0000');

        expect(driver.neopixelLed.render).toHaveBeenCalledWith(0xff0000);
    });

    it('RPi3Driver converts RGB to GRB when configured', async () => {
        const driver = new RPi3Driver() as unknown as {
            neopixelLed: { render: ReturnType<typeof vi.fn> };
            useGRBFormat: boolean;
            renderLEDNeopixel: (hexColor: string) => Promise<void>;
        };

        driver.neopixelLed = { render: vi.fn().mockResolvedValue(undefined) };
        driver.useGRBFormat = true;

        await driver.renderLEDNeopixel('FF0000');

        expect(driver.neopixelLed.render).toHaveBeenCalledWith(0x00ff00);
    });

    it('RPi4Driver parses bare RGB hex correctly', async () => {
        const driver = new RPi4Driver() as unknown as {
            neopixelLed: { render: ReturnType<typeof vi.fn> };
            useGRBFormat: boolean;
            renderLEDNeopixel: (hexColor: string) => Promise<void>;
        };

        driver.neopixelLed = { render: vi.fn().mockResolvedValue(undefined) };
        driver.useGRBFormat = false;

        await driver.renderLEDNeopixel('0000FF');

        expect(driver.neopixelLed.render).toHaveBeenCalledWith(0x0000ff);
    });
});
