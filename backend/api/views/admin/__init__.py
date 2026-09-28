"""
Everything under /api/admin/. Superadmin only, and #64-#67 add a module each.

Every view here declares `permission_classes = [IsSuperadmin]` itself, and a
test walks the URLconf to prove it (#63), so a new admin route cannot arrive
unguarded because someone forgot.
"""
