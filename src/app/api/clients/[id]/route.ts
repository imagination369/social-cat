import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { updateOrganization, deleteOrganization } from '@/lib/organizations';
import { db } from '@/lib/db';
import { workflowsTable } from '@/lib/schema';
import { eq } from 'drizzle-orm';

/**
 * PATCH /api/clients/[id]
 * Update a client organization
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, status } = body;

    // Validate inputs
    if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
      return NextResponse.json({ error: 'Client name is required' }, { status: 400 });
    }

    if (status !== undefined && status !== 'active' && status !== 'inactive') {
      return NextResponse.json({ error: 'Invalid status value' }, { status: 400 });
    }

    // Build update object
    const updates: { name?: string; status?: 'active' | 'inactive' } = {};
    if (name !== undefined) updates.name = name;
    if (status !== undefined) updates.status = status;

    // Ensure we have at least one field to update
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    // Update the organization
    await updateOrganization(id, updates);

    // If status is being changed to inactive, deactivate all workflows for this organization
    if (status === 'inactive') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (db as any)
        .update(workflowsTable)
        .set({ status: 'draft' })
        .where(eq(workflowsTable.organizationId, id));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update client:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/clients/[id]
 * Delete a client organization
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Delete the organization
    await deleteOrganization(id, session.user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete client:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
