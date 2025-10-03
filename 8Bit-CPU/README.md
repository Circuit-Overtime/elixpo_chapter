# Programmable 8-bit Computer on Breadboards

![Computer](https://firebasestorage.googleapis.com/v0/b/videolize-3563f.appspot.com/o/mySkillsImages%2Fmsg6432412431-145895.jpg?alt=media&token=35921957-3199-47e0-983f-543870513678)

<p align="center">
  <img src="https://img.shields.io/badge/EASY_EDA-Schematic-blue" alt="shields"> <img src="https://img.shields.io/badge/openSource%20in%20GitHub-8A2BE2" alt="shields"> <img src="https://img.shields.io/badge/with-Arduino_Nano-00ff65" alt="shields">
</p>


This repository contains the code, schematics, and documentation for a programmable 8-bit computer built from scratch using simple logic gates on breadboards. The project is open source and fully scalable, capable of integrating additional functions and ICs.

# Project working

```mermaid
graph TD
    A[Microinstructions 16 total] -->|Control Signals| CLogic[Control Logic Unit]
    CLogic -->|Control Signals| PC[Program Counter]
    CLogic -->|Control Signals| IR[Instruction Register]
    CLogic -->|Control Signals| AddrReg[Address Register]
    CLogic -->|Control Signals| RAM[RAM 28C64 EEPROM]
    CLogic -->|Control Signals| AReg[A Register]
    CLogic -->|Control Signals| BReg[B Register]
    CLogic -->|Control Signals| ALU[Arithmetic Logic Unit]
    CLogic -->|Control Signals| Output[Output Register]

    AddrReg -->|Address Bus| RAM
    IR -->|Instruction Bus| ALU
    AReg -->|Data Bus| ALU
    BReg -->|Data Bus| ALU
    ALU -->|Result Bus| Output
    RAM -->|Data Bus| Output
    RAM -->|Data Bus| AddrReg

    ALU -->|Flags| Flags[Flags Zero Carry Negative Even Odd]
    
    Output -->|Data Bus| Display[LED/7-Segment Display]


    Flags -->|Status Flags| LED1[LED 1 Zero]
    Flags -->|Status Flags| LED2[LED 2 Carry]
    Flags -->|Status Flags| LED3[LED 3 Negative]
    Flags -->|Status Flags| LED4[LED 4 Even]
    Flags -->|Status Flags| LED5[LED 5 Odd]
    CLogic -->|Status LEDs| LED6[LED 6 Program Counter]
    CLogic -->|Status LEDs| LED7[LED 7 Instruction Register]
    CLogic -->|Status LEDs| LED8[LED 8 ALU Operation]

```

# EEPROM Programming Sequence 

```
graph TD
    Addr[Address Input] --> EEPROM[28C64 EEPROM Programmer]
    Data[Data Input] --> EEPROM
    Write[Write Control Signal] --> EEPROM
    EEPROM --> Verify[Data Verification]
```

## Project Overview

The computer is divided into several parts:

- PWM Clock
- Address Register
- RAM
- Instruction Register
- Control Logic
- Program Counter
- A Register
- B Register
- ALU (Arithmetic Logic Unit)
- Output Display
- Output Register
- Control Word
- Overflow, Underflow, Negative Flag Register

## Credits

This project is inspired by and credits Ben Eater for the original idea and guidance. While based on his concepts, this implementation includes updates and differences, enhancing functionality and scalability.

## Features

- **Scalability:** Easily expandable with additional functions and integrated circuits.
- **Custom Updates:** Includes enhancements and modifications beyond the original design.
- **Open Source:** Available for anyone to study, modify, and contribute to.

## Repository Structure

- `code/`: Contains the code for each component of the computer. [Code](https://github.com/Circuit-Overtime/8Bit-Computer-Programs/blob/1290e9e6d5b0815a8bc3304a0e4bb99490d9940c/8_Bit%20Computer%20Control%20Logic.ino)
- `eepromFlasher/`: Contains the code to flash OP Code into EEPROM for anyone following Ben Eaters Approach of Creating Control Logic. [eepromFlasher.ino]()
- `schematics/`: Includes schematics and diagrams detailing the computer's architecture.[Schematics](https://eater.net/8bit/schematics)
- `docs/`: Documentation, user manual, and design notes at [Dedicated Docs Dropping Soon](https://github.com/Circuit-Overtime/8Bit-Computer-Programs/blob/7d66061673cd8eb7509ea8b8da835e5c4654d911/Docs)

## Getting Started

1. Clone the repository to your local machine.
2. Refer to the documentation for assembly instructions, usage, and programming the computer.
3. Explore and contribute to the project as desired.

![Computer](https://firebasestorage.googleapis.com/v0/b/videolize-3563f.appspot.com/o/mySkillsImages%2Fmsg6432412431-145897.jpg?alt=media&token=d36dbc96-da91-45cc-a37d-31657e645f3d)
<div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
    <img src="https://firebasestorage.googleapis.com/v0/b/videolize-3563f.appspot.com/o/mySkillsImages%2Fmsg6432412431-145896.jpg?alt=media&token=7bcc363b-dd5d-4477-9c1a-314ed98063f4" alt="Schematic2" width="30%">
    <img src="https://firebasestorage.googleapis.com/v0/b/videolize-3563f.appspot.com/o/mySkillsImages%2Fmsg6432412431-145898.jpg?alt=media&token=96697968-a0e8-4ad4-b03e-d779f98ee663" alt="Schematic3" width="30%">
      <img src="https://firebasestorage.googleapis.com/v0/b/videolize-3563f.appspot.com/o/mySkillsImages%2Fmsg6432412431-145899.jpg?alt=media&token=2c5d123b-e003-47b0-95af-bf26a02d17cf" alt="Schematic1" width="30%">
</div>

##Changes

- Used Arduino Nano to drive control logic in place of ATC16 EEPROMS  [Code](https://github.com/Circuit-Overtime/8Bit-Computer-Programs/blob/1290e9e6d5b0815a8bc3304a0e4bb99490d9940c/8_Bit%20Computer%20Control%20Logic.ino)
- Added a negative flag register to the system [Specific Schematic will be Dropping Soon]
```c++
IF ALU_MSB == 1 and SUB = 1 THEN NEG_FLAG = 1
```

- Updated the Code to detect negative number and push a -ve sign at the output display mux ![Specific Code will be Dropping Soon]
```.c
#define NFLAG 11;
pinMode(NFLAG, INPUT);

if(NFLAG == 1)
{
  negativeFlgFunc();
}

```

- Updated the B register to be able to output contents to the BUS
- Updated the step counter to be able to count from (000)~2~ to (110)~2~
``` Now the Step Counter can Count Upto 7 Steps, the current repo code has only 5 Steps without NOP) ```
- Smoother Clock Speed with `20ms` delay from Arduino and `333Hz` PWM Clock.


# 8-Bit CPU Component List

## 1. **PWM Clock**
- **Purpose**: Generates the clock signal for the CPU.
- **Components**:
  - 555 Timer IC (for PWM signal generation)
  - Frequency Divider (optional)

## 2. **Address Register**
- **Purpose**: Holds the address of the memory location being accessed.
- **Components**:
  - 8-bit Latch (e.g., 74LS373 or equivalent)
  - Multiplexer (e.g., 74LS157)

## 3. **RAM (28C64 EEPROM)**
- **Purpose**: Stores program instructions and data.
- **Components**:
  - 28C64 EEPROM (for non-volatile storage)
  - 8-bit Address Bus
  - 8-bit Data Bus
  - Read/Write Control Signal

## 4. **Instruction Register**
- **Purpose**: Holds the current instruction fetched from memory.
- **Components**:
  - 8-bit Register (e.g., 74LS273)
  - Instruction Decoder

## 5. **Control Logic**
- **Purpose**: Decodes microinstructions and generates control signals for the CPU.
- **Components**:
  - Arduino Nano (programmed with microinstructions)
  - Control Logic Unit (based on microinstruction set)
  - LEDs (as signals for control)

## 6. **Program Counter**
- **Purpose**: Keeps track of the address of the next instruction to be fetched.
- **Components**:
  - 8-bit Register (e.g., 74LS161)
  - Address Bus
  - Control Signals (Increment/Load/Reset)

## 7. **A Register**
- **Purpose**: Holds one operand for arithmetic or logic operations.
- **Components**:
  - 8-bit Register (e.g., 74LS273)
  - Data Bus
  - ALU (Arithmetic Logic Unit)

## 8. **B Register**
- **Purpose**: Holds the second operand for arithmetic or logic operations.
- **Components**:
  - 8-bit Register (e.g., 74LS273)
  - Data Bus
  - ALU (Arithmetic Logic Unit)

## 9. **ALU (Arithmetic Logic Unit)**
- **Purpose**: Performs arithmetic and logic operations.
- **Components**:
  - 8-bit ALU (e.g., 74LS181)
  - Flag Registers for Zero, Carry, Negative, Even, Odd

## 10. **Output Display**
- **Purpose**: Displays the result of computations or program outputs.
- **Components**:
  - 7-Segment Display or LEDs
  - Output Register

## 11. **EEPROM Programmer**
- **Purpose**: Programs the 28C64 EEPROM with data.
- **Components**:
  - EEPROM Programmer Circuit
  - 28C64 EEPROM
  - Address Bus
  - Data Bus
  - Write Control Signal

---

## Miscellaneous Components
- **Resistors** (for current limiting and pull-up/down)
- **Capacitors** (for decoupling)
- **Breadboard** (for prototyping)
- **Jumper Wires** (for connections)
- **Power Supply** (e.g., 5V DC)
- **LEDs** (for status indicators)
- **Switches** (for input signals)


## Contributions

Contributions are welcome! If you have ideas, improvements, or bug fixes, feel free to open an issue or submit a pull request.

## License

This project is licensed under the [MIT License](LICENSE).
