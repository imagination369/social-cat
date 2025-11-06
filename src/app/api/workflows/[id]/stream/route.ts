import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { executeWorkflowWithProgress } from '@/lib/workflows/executor-stream';

export const dynamic = 'force-dynamic';

/**
 * GET /api/workflows/[id]/stream
 * Execute a workflow with real-time progress streaming via SSE
 *
 * This endpoint uses Server-Sent Events (SSE) to stream execution progress
 * as each workflow step executes. The frontend receives real-time updates.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { id } = await context.params;

  // Create SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // Helper to send SSE events
      const sendEvent = (event: string, data: unknown) => {
        const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      try {
        // Execute workflow with progress callback
        await executeWorkflowWithProgress(
          id,
          session.user.id,
          'manual',
          undefined, // triggerData
          (event) => {
            // Stream each progress event to the client
            sendEvent(event.type, event);
          }
        );

        // Close stream when done
        controller.close();
      } catch (error) {
        // Send error event
        sendEvent('error', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
