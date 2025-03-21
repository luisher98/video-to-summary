# Video Summary API Documentation

## Table of Contents
- [Video Summary API Documentation](#video-summary-api-documentation)
  - [Table of Contents](#table-of-contents)
  - [Overview](#overview)
  - [Getting Started](#getting-started)
    - [Base URL](#base-url)
    - [Prerequisites](#prerequisites)
  - [Authentication](#authentication)
  - [Rate Limiting](#rate-limiting)
  - [API Endpoints](#api-endpoints)
    - [YouTube Summary](#youtube-summary)
      - [Query Parameters](#query-parameters)
      - [Example Request](#example-request)
      - [SSE Events](#sse-events)
    - [File Upload Summary](#file-upload-summary)
      - [Query Parameters](#query-parameters-1)
      - [Request Headers](#request-headers)
      - [Form Data](#form-data)
      - [Example Request](#example-request-1)
      - [SSE Events](#sse-events-1)
    - [Transcript](#transcript)
      - [Query Parameters](#query-parameters-2)
      - [Example Request](#example-request-2)
      - [Response](#response)
    - [Video Information](#video-information)
      - [Query Parameters](#query-parameters-3)
      - [Example Request](#example-request-3)
      - [Response](#response-1)
    - [Health Check](#health-check)
      - [Example Request](#example-request-4)
      - [Response](#response-2)
    - [Azure Blob Summary](#azure-blob-summary)
      - [Query Parameters](#query-parameters-4)
      - [Example Request](#example-request-5)
      - [SSE Events](#sse-events-2)
  - [Error Handling](#error-handling)
    - [Common Status Codes](#common-status-codes)
  - [Examples](#examples)
    - [JavaScript Example (Browser)](#javascript-example-browser)
    - [Node.js Example (File Upload)](#nodejs-example-file-upload)
  - [Best Practices](#best-practices)
  - [WebSocket Events](#websocket-events)
    - [Progress Event Types](#progress-event-types)
    - [Event Format](#event-format)

## Overview

The Video Summary API is a powerful service that combines video processing, AI-powered transcription, and summarization capabilities. It provides:
- AI-powered summaries of YouTube videos using GPT-4
- Processing and summarization of uploaded video files
- Real-time progress tracking via Server-Sent Events (SSE)
- Transcript extraction using OpenAI's Whisper
- Video metadata retrieval
- Hybrid storage solution for efficient file handling

## Architecture

### Core Components

1. **Summary Service**
   - Manages video processing workflow
   - Handles transcription and summarization
   - Provides real-time progress updates

2. **Storage Service**
   - Hybrid storage approach:
     - Local storage for files ≤200MB
     - Azure Blob Storage for larger files
   - Automatic cleanup of processed files
   - Stream-based file handling

3. **Processing Pipeline**
   - Video download/upload handling
   - Audio extraction using FFmpeg
   - Transcription via OpenAI Whisper
   - Summarization using GPT-4

## Getting Started

### Base URL
```
https://your-api-domain.com/api
```

### Prerequisites
- Valid YouTube URLs or video files
- HTTP client with SSE support
- Files under 500MB for uploads
- FFmpeg for video processing

### Environment Setup
Required environment variables:
- `OPENAI_API_KEY`: For AI services
- `AZURE_STORAGE_CONNECTION_STRING`: For cloud storage
- `YOUTUBE_API_KEY`: For video metadata

## Authentication

Currently uses IP-based rate limiting. Future versions will introduce API key authentication.

## Rate Limiting

- **Limit**: 10 requests per minute per IP
- **Headers**:
  - `X-RateLimit-Limit`: Maximum requests
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Time until reset (seconds)

## API Endpoints

### YouTube Summary

Generate AI-powered summaries with real-time updates.

```http
GET /youtube-summary-sse
```

#### Query Parameters
| Parameter | Type   | Required | Description                    | Default |
|-----------|--------|----------|--------------------------------|---------|
| url       | string | Yes      | YouTube video URL              | -       |
| words     | number | No       | Summary length in words        | 400     |
| prompt    | string | No       | Custom instructions for AI     | -       |

#### Technical Details
- Uses youtube-dl for video download
- FFmpeg for audio extraction
- OpenAI Whisper for transcription
- GPT-4 for summarization
- Temporary file cleanup after processing

#### SSE Events
```javascript
// Progress Events
{
  status: "downloading" | "processing" | "transcribing" | "summarizing",
  progress: number, // 0-100
  message: string
}

// Final Summary
{
  status: "done",
  summary: string
}

// Error Event
{
  status: "error",
  error: string
}
```

### File Upload Summary

Get a summary from an uploaded video file with real-time progress updates.

```http
POST /api/get-upload-summary-sse
```

#### Technical Implementation
- Chunked upload processing (50MB chunks)
- Memory optimization:
  - In-memory processing ≤200MB
  - Azure Blob Storage >200MB
- Automatic file type validation
- FFmpeg integration
- Temporary file management

#### Query Parameters
| Parameter | Type   | Required | Description             | Default |
|-----------|--------|----------|-------------------------|---------|
| words     | number | No       | Summary length in words | 400     |

#### Headers
```
Content-Type: multipart/form-data
```

#### Form Data
| Field | Type | Required | Description                    |
|-------|------|----------|--------------------------------|
| file  | file | Yes      | Video file (max size: 500MB)   |

#### Example Request
```bash
curl -N -F "file=@video.mp4" "https://your-api-domain.com/api/get-upload-summary-sse?words=300"
```

#### SSE Events
```javascript
// Progress update
event: progress
data: {
  "status": "processing",
  "progress": 25,
  "message": "Processing video..."
}

// Final summary
event: summary
data: {
  "status": "done",
  "progress": 100,
  "message": "Summary content..."
}

// Error event
event: error
data: {
  "status": "error",
  "progress": 0,
  "message": "Error message"
}
```

### Azure Blob Summary

Get a summary from a video file stored in Azure Blob Storage.

```http
GET /api/get-azure-summary-sse
```

#### Query Parameters
| Parameter | Type   | Required | Description                    | Default |
|-----------|--------|----------|--------------------------------|---------|
| fileId    | string | Yes      | ID of the file                | -       |
| blobName  | string | Yes      | Name of the blob in storage   | -       |
| words     | number | No       | Summary length in words       | 400     |

#### Example Request
```bash
curl -N "https://your-api-domain.com/api/get-azure-summary-sse?fileId=xxx&blobName=xxx&words=300"
```

#### SSE Events
```javascript
// Progress update
event: progress
data: {
  "status": "processing",
  "progress": 25,
  "message": "Processing video..."
}

// Final summary
event: summary
data: {
  "status": "done",
  "progress": 100,
  "message": "Summary content..."
}

// Error event
event: error
data: {
  "status": "error",
  "progress": 0,
  "message": "Error message"
}
```

### Transcript

Extract raw video transcripts.

```http
GET /transcript
```

#### Implementation Details
- Uses OpenAI Whisper
- Supports multiple languages
- Temporary audio file handling
- Stream processing for large files

#### Query Parameters
| Parameter | Type   | Required | Description   |
|-----------|--------|----------|---------------|
| url       | string | Yes      | YouTube URL   |

### Video Information

Retrieve video metadata.

```http
GET /info
```

#### Implementation
- YouTube Data API integration
- Cached responses
- Error handling for unavailable videos

#### Query Parameters
| Parameter | Type   | Required | Description   |
|-----------|--------|----------|---------------|
| url       | string | Yes      | YouTube URL   |

## Technical Implementation

### File Processing
- Chunked uploads (50MB chunks)
- Memory limits:
  - 200MB for in-memory processing
  - Azure Blob Storage for larger files
- FFmpeg integration for audio extraction
- Temporary file management
- Cleanup procedures

### Storage Strategy
1. **Local Storage** (≤200MB)
   - Faster processing
   - Automatic cleanup
   - Stream-based handling

2. **Azure Blob Storage** (>200MB)
   - Managed identity support
   - SAS URL generation
   - Automatic expiration
   - Secure access

### Security Measures
- File type validation
- Size restrictions
- Secure headers
- Azure managed identity
- Request logging
- Rate limiting

### Performance Optimization
- Chunked file processing
- Debounced progress updates
- Parallel processing
- Stream-based operations
- Memory management

## Error Handling

Structured error responses:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": {} // Optional technical details
  }
}
```

### Status Codes
| Code | Description           | Common Causes                          |
|------|--------------------- |---------------------------------------|
| 400  | Bad Request          | Invalid parameters or URL              |
| 404  | Not Found            | Invalid YouTube URL                    |
| 413  | Payload Too Large    | File size exceeds 500MB               |
| 415  | Unsupported Media    | Invalid file format                   |
| 429  | Too Many Requests    | Rate limit exceeded                   |
| 500  | Internal Server Error| Processing failure                    |
| 503  | Service Unavailable  | Azure Storage/OpenAI API issues       |

## Examples

### JavaScript SSE Client
```javascript
const eventSource = new EventSource(
  'https://api.domain.com/youtube-summary-sse?url=youtube.com/watch?v=example'
);

eventSource.addEventListener('progress', (event) => {
  const data = JSON.parse(event.data);
  console.log(`${data.status}: ${data.progress}%`);
});

eventSource.addEventListener('summary', (event) => {
  const data = JSON.parse(event.data);
  console.log('Summary:', data.summary);
  eventSource.close();
});

eventSource.onerror = (error) => {
  console.error('SSE Error:', error);
  eventSource.close();
};
```

### File Upload with Progress
```javascript
const form = new FormData();
form.append('video', file);

const response = await fetch('/api/upload-summary-sse', {
  method: 'POST',
  body: form
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const {value, done} = await reader.read();
  if (done) break;
  
  const events = decoder.decode(value).split('\n\n');
  for (const event of events) {
    if (!event.trim()) continue;
    const data = JSON.parse(event.replace('data: ', ''));
    console.log(`${data.status}: ${data.progress}%`);
  }
}
```

## Best Practices

### Client Implementation
1. **Error Handling**
   - Implement SSE error listeners
   - Handle network timeouts
   - Implement reconnection logic
   - Validate input before API calls

2. **Resource Management**
   - Close SSE connections when done
   - Respect file size limits
   - Implement retry logic
   - Monitor rate limits

3. **Progress Tracking**
   - Display all progress stages
   - Handle all SSE event types
   - Implement error recovery
   - Show meaningful progress UI

4. **Performance**
   - Use appropriate chunk sizes
   - Implement request queuing
   - Monitor memory usage
   - Cache responses when appropriate

### Server Considerations
1. **File Handling**
   - Validate file types
   - Use stream processing
   - Implement cleanup procedures
   - Monitor storage usage

2. **Error Management**
   - Log all errors
   - Provide meaningful messages
   - Implement fallbacks
   - Monitor API health

3. **Resource Usage**
   - Monitor memory usage
   - Track API quotas
   - Implement caching
   - Optimize storage use

## WebSocket Events

### Progress Event Types
| Status      | Description                              |
|-------------|------------------------------------------|
| downloading | Video download in progress               |
| uploading   | File upload in progress                 |
| processing  | Video/audio processing                  |
| transcribing| Generating transcript                   |
| summarizing | Creating AI summary                     |
| done        | Process complete                        |
| error       | Error occurred                          |

### Event Format
```typescript
interface ProgressEvent {
  status: string;
  progress: number;
  message?: string;
}

interface SummaryEvent {
  status: 'done';
  summary: string;
}

interface ErrorEvent {
  status: 'error';
  error: string;
  details?: any;
}
``` 