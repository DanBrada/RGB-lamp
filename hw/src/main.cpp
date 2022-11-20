#include <Arduino.h>
#include <Adafruit_NeoPixel.h>
#include <BLEServer.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <DHT.h>
#include <BLEDevice.h>
#include <ArduinoJson.h>

#define NEOPIXEL_PIN 19
#define NEOPIXELS 4
#define BTN_PIN 21
#define DHT11_PIN 18

/***************/
#define SERVICE_UUID "be17f099-e27e-46a6-afd3-64f9a36b6ded"
#define CHARACTERISTIC_UUID "92942693-ee1a-4106-84c9-7fad6975320f"
/***************/
DHT dht;

Adafruit_NeoPixel pixels(NEOPIXELS, NEOPIXEL_PIN, NEO_GRB + NEO_KHZ800);
BLECharacteristic *pCharacteristic;

bool deviceIsConencted = false;
volatile bool lampIsOn = true;
int globalBrightness = 100;

float teplota = 0.0f, vlhkost = 0.0f;

unsigned long lastMilis = 0;

uint32_t fillColor = 0;

int selectMode = 0;

int rainbowCycles = 0, maxCycles = 256 * 5;
unsigned long rainbowCycleTimeBuffer = 0;

bool samplingPeriodHasPassed(int thePeriod) {
	if (lastMilis == 0) {
		lastMilis = millis();
		return true; //yes, because it's most probably at startup
	}

	unsigned long currentMilis = millis();
	bool isHasPasssed = false;
	if (currentMilis < lastMilis) { // handle millis() overflow
		isHasPasssed = /*Total miliseconds to max*/((ULONG_MAX - lastMilis) + currentMilis) >= thePeriod;
	} else isHasPasssed = (currentMilis - lastMilis) >= thePeriod;
	if (isHasPasssed) lastMilis = currentMilis;
	return isHasPasssed;
}

bool customBufferPeriodPassed(int thePeriod, unsigned long &buffer) {
	if (buffer == 0) {
		buffer = millis();
		return true; //yes, because it's most probably at startup
	}

	unsigned long currentMilis = millis();
	bool isHasPasssed = false;
	if (currentMilis < buffer) { // handle millis() overflow
		isHasPasssed = /*Total miliseconds to max*/((ULONG_MAX - buffer) + currentMilis) >= thePeriod;
	} else isHasPasssed = (currentMilis - buffer) >= thePeriod;
	if (isHasPasssed) buffer = currentMilis;
	return isHasPasssed;
}

void sendDeviceUpdate() {
	if (deviceIsConencted) {
		char msg[512];
		sprintf(msg, "%.2f,%.2f,%s", teplota, vlhkost, lampIsOn ? "true" : "false");
		pCharacteristic->setValue(msg);
		pCharacteristic->notify();
	}
}

void buttonSwitch() {
	lampIsOn = !lampIsOn;
	sendDeviceUpdate();
}

class ServerCallbacks : public BLEServerCallbacks {
	void onConnect(BLEServer *pServer) {
		deviceIsConencted = true;
	}

	void onDisconnect(BLEServer *pServer) {
		deviceIsConencted = false;
	}
};

class RXCallback : public BLECharacteristicCallbacks {
	void onWrite(BLECharacteristic *characteristic) {
		// TODO handle massege
		std::string zprava = pCharacteristic->getValue();

		StaticJsonDocument<500> doc;
		DeserializationError e = deserializeJson(doc, zprava);

		lampIsOn = doc.getMember("state").as<bool>();
		globalBrightness = doc.getMember("brightness").as<int>();

		if (strcmp("weather", doc.getMember("mode").as<const char *>()) == 0) selectMode = 0;
		if (strcmp("rainbow", doc.getMember("mode").as<const char *>()) == 0 && selectMode != 2) {
			selectMode = 2;
			rainbowCycles = 0;
			rainbowCycleTimeBuffer = 0;
		}

		if (strcmp("fill", doc.getMember("mode").as<const char *>()) == 0 && doc.containsKey("value")) {
			int r = doc.getMember("value").getMember("r").as<int>(),
					g = doc.getMember("value").getMember("g").as<int>(),
					b = doc.getMember("value").getMember("b").as<int>();
			Serial.println("------");
			Serial.println(r);
			Serial.println(g);
			Serial.println(b);
			Serial.println("------");
			fillColor = Adafruit_NeoPixel::Color(r, g, b);
			pixels.fill(fillColor);
			pixels.show();
			selectMode = 1;
		}

		sendDeviceUpdate();
	}
};

byte *Wheel(byte WheelPos) {
	static byte c[3];

	if (WheelPos < 85) {
		c[0] = WheelPos * 3;
		c[1] = 255 - WheelPos * 3;
		c[2] = 0;
	} else if (WheelPos < 170) {
		WheelPos -= 85;
		c[0] = 255 - WheelPos * 3;
		c[1] = 0;
		c[2] = WheelPos * 3;
	} else {
		WheelPos -= 170;
		c[0] = 0;
		c[1] = WheelPos * 3;
		c[2] = 255 - WheelPos * 3;
	}

	return c;
}

void rainbowCycle(int SpeedDelay) {
	byte *c;

	if (customBufferPeriodPassed(SpeedDelay, rainbowCycleTimeBuffer))
		for (int i = 0; i < NEOPIXELS; i++) {
			c = Wheel(((i * 256 / NEOPIXELS) + rainbowCycles) & 255);
			pixels.setPixelColor(i, *c, *(c + 1), *(c + 2));
		}
	pixels.show();
	rainbowCycles++;
	if (rainbowCycles == maxCycles) rainbowCycles = 0;
}


void setup() {
	pinMode(BTN_PIN, INPUT_PULLUP);
	pixels.begin();
	pixels.setBrightness(100);
	pixels.fill(Adafruit_NeoPixel::Color(0, 150, 0));
	pixels.show();

	dht.setup(DHT11_PIN, DHT::DHT11);
	Serial.begin(9600);

	BLEDevice::init("Chytrá IoT Lampička!!!1");
	BLEServer *pServer = BLEDevice::createServer();
	pServer->setCallbacks(new ServerCallbacks());
	BLEService *pService = pServer->createService(SERVICE_UUID);
	pCharacteristic = pService->createCharacteristic(
			CHARACTERISTIC_UUID,
			BLECharacteristic::PROPERTY_READ |
			BLECharacteristic::PROPERTY_WRITE |
			BLECharacteristic::PROPERTY_NOTIFY
	);
	pCharacteristic->setCallbacks(new RXCallback());

	pService->start();
	BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
	pAdvertising->addServiceUUID(SERVICE_UUID);
	pAdvertising->setScanResponse(true);
	pAdvertising->setMinPreferred(0x06);  // functions that help with iPhone connections issue
	pAdvertising->setMinPreferred(0x12);
	BLEDevice::startAdvertising();

	attachInterrupt(digitalPinToInterrupt(BTN_PIN), buttonSwitch, FALLING);
}

void loop() {
	if (samplingPeriodHasPassed(dht.getMinimumSamplingPeriod() *
								2)) { // because we are measuring asynchrounously, do measurement stuff only sometimes
		teplota = dht.getTemperature();
		vlhkost = dht.getHumidity();
		Serial.print("Teplota: ");
		Serial.print(teplota, 1);
		Serial.print("°C, Vlhkost: ");
		Serial.print(vlhkost);
		Serial.println("%");

		sendDeviceUpdate();
	}


	if (lampIsOn) {
		switch (selectMode) {
			case 0:
				if (teplota < 10) {
					pixels.fill(Adafruit_NeoPixel::Color(39, 17, 237));
				} else if (teplota < 18) {
					pixels.fill(Adafruit_NeoPixel::Color(139, 199, 220));
				} else if (teplota < 24) {
					pixels.fill(Adafruit_NeoPixel::Color(0, 150, 0));
				} else if (teplota < 30) {
					pixels.fill(Adafruit_NeoPixel::Color(237, 230, 17));
				} else {
					pixels.fill(Adafruit_NeoPixel::Color(255, 0, 0));
				}
				break;
			case 1:
				pixels.fill(fillColor);
				break;
			case 2:
				rainbowCycle(75;);
				break;
			default:
				pixels.clear();
		}
	} else pixels.clear();
	pixels.show();

}