import AppKit
let size = NSSize(width: 1024, height: 1024)
let image = NSImage(size: size)
image.lockFocus()
NSColor(calibratedRed: 0.13, green: 0.35, blue: 0.26, alpha: 1).setFill()
NSRect(origin: .zero, size: size).fill()
let paragraph = NSMutableParagraphStyle()
paragraph.alignment = .center
let font = NSFont(name: "GeezaPro-Bold", size: 620) ?? NSFont.systemFont(ofSize: 620, weight: .semibold)
let attrs: [NSAttributedString.Key: Any] = [.font: font, .foregroundColor: NSColor(calibratedRed: 0.97, green: 0.97, blue: 0.93, alpha: 1), .paragraphStyle: paragraph]
("ح" as NSString).draw(in: NSRect(x: 90, y: 185, width: 844, height: 745), withAttributes: attrs)
NSColor(calibratedRed: 0.84, green: 0.48, blue: 0.34, alpha: 1).setFill()
NSBezierPath(ovalIn: NSRect(x: 270, y: 192, width: 82, height: 82)).fill()
image.unlockFocus()
let bitmap = NSBitmapImageRep(data: image.tiffRepresentation!)!
try bitmap.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: "assets/icon.png"))
