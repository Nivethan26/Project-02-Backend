# Inventory Routing Structure

## Overview
This document explains the consolidated inventory routing structure after removing duplicate route files.

## Route Files

### 1. `routes/inventoryRoutes.js` (Main File)
- **Purpose**: Single source of truth for all inventory operations
- **Access Control**: 
  - `GET /` - Staff can view (admin, pharmacist, doctor)
  - `POST /` - Only admin can add
  - `PUT /:id` - Only admin can update
  - `DELETE /:id` - Only admin can delete

## Server Mounting

### Admin Access
```javascript
app.use('/api/admin/inventory', inventoryRoutes);
```
- **URL**: `http://localhost:8000/api/admin/inventory`
- **Access**: Admin only for CRUD operations
- **Frontend**: Used by admin dashboard

### Staff Access  
```javascript
app.use('/api/staff/inventory', inventoryRoutes);
```
- **URL**: `http://localhost:8000/api/staff/inventory`
- **Access**: Staff (admin, pharmacist, doctor) for read-only
- **Frontend**: Used by pharmacist dashboard

## Frontend Usage

### Admin Dashboard
- **File**: `frontend/app/dashboard/admin/inventory/page.tsx`
- **Endpoint**: `/api/admin/inventory`
- **Features**: Full CRUD operations (Create, Read, Update, Delete)

### Pharmacist Dashboard
- **File**: `frontend/app/dashboard/pharmacist/inventory/page.tsx`
- **Endpoint**: `/api/staff/inventory`
- **Features**: Read-only view (no edit/delete buttons)

## Authentication Middleware

### `protect` Middleware
- Verifies JWT token
- Adds user to request object

### `admin` Middleware  
- Checks if user role is 'admin'
- Used for POST, PUT, DELETE operations

### `staff` Middleware
- Checks if user role is 'admin', 'pharmacist', or 'doctor'
- Used for GET operations
