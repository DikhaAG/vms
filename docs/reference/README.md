# HikCentral OpenAPI V3.1.1 Reference Index

Chapter and line-number index into [HikCentral Professional OpenAPI V3.1.1_Developer Guide_V3.1.1_20260723.md](./HikCentral%20Professional%20OpenAPI%20V3.1.1_Developer%20Guide_V3.1.1_20260723.md) (33,242 lines). Read only the line range for the chapter you need.

## Protocol & Setup

| Section | Lines | Covers |
| --- | --- | --- |
| Table of Contents | 70–365 | Full chapter/page overview |
| 1.7 Terms and Definitions | 455–499 | Artemis, OpenAPI, `VMSPlatform`, domain terms |
| Chapter 2 Getting Started | 1003–1151 | Installation & HTTPS/Artemis configuration (Ch. 2.2 at L1076) |
| 3.1 Request and Response Rule | 1153–1277 | URI prefix `/artemis/api/...`, JSON envelope `{ code, msg, data }` |
| 3.2 Signature and Authentication | 1278–1408 | `HmacSHA256`, `X-Ca-*` headers, `Content-MD5`, `stringToSign` examples |

## Typical Workflows (Chapter 4)

| Section | Lines | Covers |
| --- | --- | --- |
| 4.1 Common Application | 1410–1423 | Connectivity/version flow |
| 4.2 Resource Management | 1424–1827 | Regions, cameras, persons, organizations |
| 4.3 Event and Alarm | 1828–1962 | Subscriptions, alarms |
| 4.4 Video Application | 1963–2244 | Live preview, playback, capture |
| 4.5 Access Control | 2245–2378 | Doors, privileges, access events |
| 4.6 Visitor Management | 2379–2534 | Appointment -> register -> check-in/out lifecycle |

## API Reference (Chapter 5)

| Section | Lines | Covers |
| --- | --- | --- |
| 5.1 Common API | 3103–3210 | `POST /artemis/api/common/v1/version` (L3110–3148), system endpoints |
| 5.2 Physical Resources API | 3211–4951 | Encoding devices, cameras, alarms, doors |
| 5.3 Logical Resources API | 4952–13348 | Regions, persons (`personList`), cards, vehicles |
| 5.4 Video API | 13349–17342 | Streaming URLs, snapshots (`camera/capture`), PTZ |
| 5.5 Alarm and Event API | 17343–18366 | Event subscriptions and query |
| 5.6 Intelligent Analysis API | 18367–18584 | Analytics endpoints |
| 5.7 Visitor API | 18585–22457 | Visitor appointment, registration, records, checkout |
| 5.8 Vehicle and Parking API | 22458–24282 | Parking lots, vehicles, entrance/exit |
| 5.9 Access Control API | 24283–25542 | Doors, privilege groups, access logs |
| 5.10–5.15 Domain Modules | 25543–33242 | On-Board (L25543), Display (L26047), Video Tracing (L27038), Attendance (L27327), Canteen (L27582), Education (L29136) |

## Key Endpoints for Visitor & Access Control

Direct line numbers for high-frequency integration endpoints in the developer guide:

| Endpoint | Guide Line | Description |
| --- | --- | --- |
| `POST /artemis/api/resource/v1/acsDevice/acsDeviceList` | L3254 | Query all Access Control devices and MinMoe face terminals |
| `POST /artemis/api/resource/v1/acsDevice/indexCode/acsDeviceInfo` | L3330 | Query details, IP, port, and serial of a specific ACS device |
| `POST /artemis/api/resource/v1/door/doorList` | L3450 | Query physical doors, channels, and parent controller index codes |
| `POST /artemis/api/eventService/v1/eventSubscriptionByEventTypes` | L17674 | Register real-time REST callback webhook for access events (e.g. 196893, 197121) |
| `POST /artemis/api/eventService/v1/eventSubscriptionView` | L17757 | Inspect active event subscriptions and destination URLs |
| `POST /artemis/api/visitor/v2/appointment` | L18590 | Pre-registration and appointment reservation with face photo data |
| `POST /artemis/api/visitor/v1/registerment` | L18720 | Front-desk check-in and terminal credential provisioning |
| `POST /artemis/api/visitor/v1/out` | L18850 | Visitor check-out and instant hardware terminal de-authorization |
| `POST /artemis/api/acs/v1/privilege/group` | L24300 | Query access level privilege groups |
| `POST /artemis/api/acs/v1/privilege/group/single/addPersons` | L24400 | Dynamically assign additional doors or access levels to a person/visitor |
| `POST /artemis/api/acs/v1/door/events` | L24500 | Historical query of card-swiping and face-recognition door passage events |


