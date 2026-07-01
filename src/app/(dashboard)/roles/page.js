"use client";



import { useState, useEffect, useCallback } from "react";

import { useRouter } from "next/navigation";

import { motion } from "framer-motion";

import { Shield, Check, Lock, Pencil } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";

import { Checkbox } from "@/components/ui/checkbox";

import { api } from "@/lib/api-client";

import { useAuth } from "@/context/auth-context";



function canManageRoles(user) {

  return user?.role === "admin" || user?.role === "super_admin";

}



export default function RolesPage() {

  const { user, isLoading } = useAuth();

  const router = useRouter();

  const [roles, setRoles] = useState([]);

  const [allPermissions, setAllPermissions] = useState([]);

  const [canManage, setCanManage] = useState(false);

  const [editMode, setEditMode] = useState(false);

  const [saving, setSaving] = useState(null);



  const loadRoles = useCallback(() => {

    api.roles().then((data) => {

      setRoles(data.roles || []);

      setCanManage(data.canManage || false);

    }).catch(() => {});

  }, []);



  useEffect(() => {

    if (!isLoading && user && !canManageRoles(user)) {

      router.replace("/dashboard");

    }

  }, [user, isLoading, router]);



  useEffect(() => {

    if (!user || !canManageRoles(user)) return;

    loadRoles();

    api.permissions().then((data) => {

      setAllPermissions(data.permissions || []);

    }).catch(() => {});

  }, [user, loadRoles]);



  const togglePermission = async (roleId, permissionId, isAssigned) => {

    const key = `${roleId}-${permissionId}`;

    setSaving(key);

    try {

      if (isAssigned) {

        await api.removeRolePermission({ roleId, permissionId });

      } else {

        await api.assignRolePermission({ roleId, permissionId });

      }

      loadRoles();

    } catch {

      // ignore — role state unchanged on failure

    } finally {

      setSaving(null);

    }

  };



  if (isLoading || !user || !canManageRoles(user)) {

    return null;

  }



  const permissionsByModule = allPermissions.reduce((acc, perm) => {

    if (!acc[perm.moduleName]) acc[perm.moduleName] = [];

    acc[perm.moduleName].push(perm);

    return acc;

  }, {});



  return (

    <div className="space-y-6">

      <div className="flex flex-wrap items-start justify-between gap-4">

        <div>

          <h1 className="font-display text-2xl font-bold lg:text-3xl">Roles & Permissions</h1>

          <p className="text-muted-foreground">Dynamic role-based access control from database</p>

        </div>

        {canManage && (

          <button

            type="button"

            onClick={() => setEditMode((v) => !v)}

            className="inline-flex items-center gap-2 rounded-lg bg-champagne px-4 py-2 text-sm font-medium text-white shadow-glow transition hover:bg-champagne/90"

          >

            <Pencil className="h-4 w-4" />

            {editMode ? "Done Editing" : "Edit Permissions"}

          </button>

        )}

      </div>



      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">

        {roles.map((role, i) => {

          const assignedIds = new Set(role.permissionDetails.map((p) => p.id));



          return (

            <motion.div

              key={role.id}

              initial={{ opacity: 0, y: 20 }}

              animate={{ opacity: 1, y: 0 }}

              transition={{ delay: i * 0.08 }}

            >

              <Card className="glass-card h-full overflow-hidden">

                <div className={`h-2 bg-gradient-to-r ${role.color}`} />

                <CardHeader>

                  <div className="flex items-center justify-between">

                    <div className="flex items-center gap-3">

                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r ${role.color} text-white`}>

                        <Shield className="h-5 w-5" />

                      </div>

                      <div>

                        <CardTitle className="text-lg">{role.name}</CardTitle>

                        <Badge variant="outline" className="mt-1 text-[10px]">{role.roleName}</Badge>

                      </div>

                    </div>

                    <Badge variant="secondary">{role.permissionCount} perms</Badge>

                  </div>

                  <CardDescription className="mt-2">

                    {role.userCount} employee{role.userCount !== 1 ? "s" : ""} · Updated {new Date(role.lastUpdated).toLocaleDateString("en-IN")}

                  </CardDescription>

                </CardHeader>

                <CardContent>

                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">

                    {editMode ? "Toggle Permissions" : "Assigned Permissions"}

                  </p>

                  <ul className="space-y-2 max-h-64 overflow-y-auto">

                    {editMode && canManage

                      ? Object.entries(permissionsByModule).map(([module, perms]) => (

                          <li key={module}>

                            <p className="mb-1 mt-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">{module}</p>

                            <ul className="space-y-1.5">

                              {perms.map((perm) => {

                                const assigned = assignedIds.has(perm.id);

                                const busy = saving === `${role.id}-${perm.id}`;

                                return (

                                  <li key={perm.id} className="flex items-center gap-2 text-sm">

                                    <Checkbox

                                      id={`${role.id}-${perm.id}`}

                                      checked={assigned}

                                      disabled={busy}

                                      onCheckedChange={() => togglePermission(role.id, perm.id, assigned)}

                                    />

                                    <label

                                      htmlFor={`${role.id}-${perm.id}`}

                                      className={`cursor-pointer ${assigned ? "text-foreground" : "text-muted-foreground"}`}

                                    >

                                      {perm.permissionName}

                                    </label>

                                  </li>

                                );

                              })}

                            </ul>

                          </li>

                        ))

                      : role.permissions.map((perm) => (

                          <li key={perm} className="flex items-center gap-2 text-sm">

                            <Check className="h-4 w-4 text-emerald-500 shrink-0" />

                            {perm}

                          </li>

                        ))}

                  </ul>

                </CardContent>

              </Card>

            </motion.div>

          );

        })}

      </div>



      {canManage && (

        <Card className="glass-card">

          <CardHeader>

            <CardTitle className="flex items-center gap-2">

              <Lock className="h-5 w-5 text-champagne" />

              Permission Management

            </CardTitle>

            <CardDescription>Only Super Admin and Admin can edit role permissions</CardDescription>

          </CardHeader>

          <CardContent>

            <p className="text-sm text-muted-foreground">

              Click &quot;Edit Permissions&quot; to assign or remove permissions for each role.

              Changes are saved immediately and apply to all employees with that role.

            </p>

          </CardContent>

        </Card>

      )}

    </div>

  );

}

