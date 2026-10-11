# Project title bar

The Desktop title bar ends at the project/session sidebar's right edge. The area to its right is reserved for workspace tabs; this change does not implement multiple tabs or modify the embedded chat header.

The title bar displays only the selected project, using its alias or directory name and the same avatar color/initials as the Projects page at a smaller size. Its Tippy dropdown lists visible projects in the existing project order, supports searching by name, and opens the selected project's page through the existing router. New chat uses a plus icon inside the title bar. The project-opening folder button is omitted from this area; existing project-adding entry points elsewhere remain available.

The title bar and shell body share the same grid columns and resize transition. Both boundaries follow the persisted sidebar width and collapse together. Browser checks confirmed project selection, matching boundaries after resizing, and sidebar collapse/restore. The renderer build passed.
