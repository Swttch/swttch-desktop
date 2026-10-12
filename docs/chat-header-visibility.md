# Embedded chat header visibility

Desktop chat views default to `top_bar_display=F`. The local session URL factory adds the parameter and the final iframe adapter enforces it while preserving session, working-directory, pairing, and other parameters. New, restored, and split views use the same adapter.

This hides only the chat's visual header. Activity/title reporting, scheduled-message delivery, and Desktop host-action listeners remain mounted on the chat page. Browser checks confirmed the parameter on every open view and absence of the former session-dropdown header button.
