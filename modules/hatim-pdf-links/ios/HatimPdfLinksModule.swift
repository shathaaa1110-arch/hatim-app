import ExpoModulesCore
import PDFKit

struct HatimPdfLink: Record {
  @Field var text: String = ""
  @Field var url: String = ""
  @Field var fromEnd: Int = 0
}

public class HatimPdfLinksModule: Module {
  public func definition() -> ModuleDefinition {
    Name("HatimPdfLinks")
    AsyncFunction("addLinks") { (uri: URL, links: [HatimPdfLink]) in
      guard uri.isFileURL, let document = PDFDocument(url: uri) else {
        throw NSError(domain: "HatimPdfLinks", code: 1,
                      userInfo: [NSLocalizedDescriptionKey: "تعذّر قراءة ملف الدعوة."])
      }
      for link in links {
        // Visible LTR labels survive PDF text extraction; Arabic shaping does not.
        // Links follow all editable text. Count from the end so a message that
        // mentions Google Maps cannot shift the template's venue-to-URL mapping.
        let matches = document.findString(link.text, withOptions: [])
        let index = matches.count - 1 - link.fromEnd
        guard !link.text.isEmpty, let url = URL(string: link.url),
              ["https", "http"].contains(url.scheme ?? ""),
              link.fromEnd >= 0, index >= 0, index < matches.count else {
          throw NSError(domain: "HatimPdfLinks", code: 2,
                        userInfo: [NSLocalizedDescriptionKey: "تعذّر تجهيز روابط الملف. حاول مرة ثانية."])
        }
        let selection = matches[index]
        for line in selection.selectionsByLine() {
          for page in line.pages {
            let annotation = PDFAnnotation(bounds: line.bounds(for: page), forType: .link, withProperties: nil)
            annotation.url = url
            page.addAnnotation(annotation)
          }
        }
      }
      guard let data = document.dataRepresentation() else {
        throw NSError(domain: "HatimPdfLinks", code: 3,
                      userInfo: [NSLocalizedDescriptionKey: "تعذّر حفظ روابط الملف."])
      }
      try data.write(to: uri, options: .atomic)
    }
  }
}
