---
name: incident-lister
description: Lists incidents from the Incident Management API.
metadata:
  createdAt: '2026-01-18T19:04:11.963Z'
allowed-tools:
  - Incident-Management-v4_listIncident
mcp-servers:
  - Incident-Management-v4
depends-on:
  - mcp-server-oauth
---
## Description

This skill lists incidents from the Incident Management API. It connects to the "Incident-Management-v4" MCP server, authenticates using OAuth, and retrieves a list of incidents.

## Usage

To use this skill, simply invoke it. It will automatically connect to the Incident Management server and display the list of incidents.

## Dependencies

This skill depends on the `mcp-server-oauth` skill for handling OAuth authentication.

## MCP Server

Incident-Management-v4

## Tools Used

*   `Incident-Management-v4_listIncident`
