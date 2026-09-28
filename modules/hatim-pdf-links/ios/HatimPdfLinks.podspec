Pod::Spec.new do |s|
  s.name = 'HatimPdfLinks'
  s.version = '1.0.0'
  s.summary = 'Preserve interactive links in Hatim invitation PDFs.'
  s.description = s.summary
  s.author = 'Hatim'
  s.homepage = 'https://github.com/shathaaa1110-arch/hatim-app'
  s.license = { :type => 'UNLICENSED' }
  s.platforms = { :ios => '16.4' }
  s.source = { :git => s.homepage }
  s.static_framework = true
  s.swift_version = '5.9'
  s.dependency 'ExpoModulesCore'
  s.frameworks = 'PDFKit'
  s.source_files = '**/*.swift'
end
