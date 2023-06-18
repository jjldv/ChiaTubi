# ChiaTubi

ChiaTubi is a project designed to test the features of the Chia DataLayer. It allows users to create video stores and share them with others using the store's ID. Working on Windows.

## Features

- Create video stores for sharing with others
- Register videos for playback
- Subscribe to videos for playback

## Prerequisites

To run ChiaTubi, please ensure you have the following:

- Chia installed with the DataLayer service activated
- File Server propagation enabled
- Port 8575 open on your router

## Installation

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
npm install
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

![Add Video](screenshots/add_video.png)
![Execution Queue](screenshots/execution_queue.png)
![Subscribe to Video](screenshots/subscribe_video.png)
![Unsubscribe from Video](screenshots/unsubscribe_video.png)
![Play Video](screenshots/play_video.png)
![Add Mirror](screenshots/add_mirror.png)
![Remove Mirror](screenshots/remove_mirror.png)


## Technologies Used

- JavaScript
- Chia Network DataLayer RPC API

## Known Limitations

- Video registration can be slow due to the transaction size of 2 MB each.

## Contact

For any questions or support, you can reach me on Twitter: [@MrDennisV](https://twitter.com/MrDennisV)
