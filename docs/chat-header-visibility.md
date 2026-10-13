# Embedded chat header visibility

Desktop chat views are opened with `is_desktop=1`, which tells the chat page that the Desktop app is hosting it. The page decides what that changes; today it leaves out the chat's own top bar. The local session URL factory adds the parameter and the final iframe adapter enforces it while preserving session, working-directory, pairing, and other parameters. New, restored, and split views use the same adapter.

This hides only the chat's visual header. Activity/title reporting, scheduled-message delivery, and Desktop host-action listeners remain mounted on the chat page. Browser checks confirmed the parameter on every open view and absence of the former session-dropdown header button.

The parameter replaces `top_bar_display=F`, the name earlier Desktop builds sent. The chat webview still reads the older name, so a Desktop build that sends it keeps hiding the header. The webview release that reads `is_desktop` has to be installed before a Desktop build that sends only `is_desktop=1` is used; an older webview ignores the new name and draws its top bar.
