# Side panel

`SidePanel` is the right-hand detail panel (header, scrolling body, footer). It is built on
`ui/sheet`, so below `md` it becomes a bottom drawer automatically; its header, body and footer use
`max-md:` padding and the footer is sticky. Build panel content from `SidePanelSection` and
`SidePanelEntityRow`; never import `ui/sheet` elsewhere in features. See
[components/ui](../ui/README.md).
