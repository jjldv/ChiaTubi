![image](https://github.com/jjldv/ChiaTubi/assets/6075488/f604c9c8-4052-45dc-a0b9-a4657b2e9988)


My Chia wallet address
xch1ult3wq656evlypymmtn58ccjsrun2wxc9lwrp3zspcczklptak8swpxjmu

ChiaTubi is a project designed to test the features of the Chia DataLayer. It allows users to create video stores and share them with others using the store's ID. Working on Windows.

## Features

- Create video stores for sharing with others
- Register videos for playback
- Subscribe to videos for playback

## Prerequisites

To run ChiaTubi, please ensure you have the following:

- Node.js
- Python
- Chia installed with the DataLayer service activated
- File Server propagation enabled
- Port 8575 open on your router

## Installation

1. Download the release for Windows https://github.com/jjldv/ChiaTubi/releases

   or
   
1. Clone the repository:

```shell
git clone https://github.com/jjldv/ChiaTubi.git
```

2. Navigate to the project directory:

```shell
cd ChiaTubi
```

3. Install dependencies:
```shell
npm install -g node-gyp
```

## Usage

1. Run the app as an Electron application:

```shell
npm start
```


2. Once the app is running, you can perform the following actions:

- Add a video: Follow the instructions to add a video to the store.
- View execution queue: Check the queue to see pending video registrations.
- Subscribe to a video: Enter the store ID and subscribe to the desired video.
- Unsubscribe from a video: Use the provided options to unsubscribe from a video.
- Play a video: Select a video from your subscribed list to start playback.
- Add a mirror: Follow the steps to add a mirror for a video.
- Remove a mirror: Select the video and remove an existing mirror.

## Screenshots

Home
![image](https://github.com/jjldv/ChiaTubi/assets/6075488/aefdb882-d7ff-4ed0-bfab-54f116111231)

Adding Video
![image](https://github.com/jjldv/ChiaTubi/assets/6075488/34ba2a4f-3226-4e6a-b8c8-0ccb93587db6)

Check Pending Transactions
![image](https://github.com/jjldv/ChiaTubi/assets/6075488/48b3a0a8-755b-46ef-b4ee-48c141b8f184)

Subscribe to a Video
![image](https://github.com/jjldv/ChiaTubi/assets/6075488/c02a181f-fcf6-406c-bede-d6d07af008f1)

Unsubscribe
![image](https://github.com/jjldv/ChiaTubi/assets/6075488/1e47516b-4e27-409a-afb5-68c1242eab50)

Play Video
![image](https://github.com/jjldv/ChiaTubi/assets/6075488/a016b12e-ff8c-4827-890c-89e50873d9da)

Check Mirrors
![image](https://github.com/jjldv/ChiaTubi/assets/6075488/1c27fb37-d8ee-468c-9dfd-646ac1424960)
![image](https://github.com/jjldv/ChiaTubi/assets/6075488/d4f83d21-0b6e-49aa-80b2-231f8b33ab24)



## Stores to Share, under Attribution 3.0 Unported (CC BY 3.0)


Sintel 2010
IdStore: f8af18852df6a3ff114503c57440f45b85ca0576515330110b7ffbf2d164fe23
![image](https://github.com/jjldv/ChiaTubi/assets/6075488/d9d7f76d-fea1-48db-a428-808d98b022ba)



Elephants Dream
IdStore:0e93acc539368de4225a7a8fa0e1ebfa6b44e5695dd1c9991097b4786d42a148
![image](https://github.com/jjldv/ChiaTubi/assets/6075488/73a9a02a-8414-4745-9f3b-cb94e04f01e2)



Big Buck Bunny
IdStore:afd664fdcf5e069b362317423e2f4ef939998bd1cbc3c5fea596e51ecfe9e1c8
![image](https://github.com/jjldv/ChiaTubi/assets/6075488/5976c25e-5aac-4c1f-956f-2992c7050d12)



Tears of Steel
IdStore: 1ee342eb6be98dc52840ec5f91a5d29d5937cf766116ce5fb329015b914a57d6
![image](https://github.com/jjldv/ChiaTubi/assets/6075488/b35eb61f-47d9-4fb7-9ad8-5c7f8a1b14d3)




## Technologies Used

- JavaScript
- Chia Network DataLayer RPC API

## Known Limitations

- Video registration can be slow due to the transaction size of 2 MB each.
- If Chia DL Crashes, just restart services.

## Contact

For any questions or support, you can reach me on Twitter: [@MrDennisV](https://twitter.com/MrDennisV)
