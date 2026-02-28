require 'xcodeproj'
project = Xcodeproj::Project.open('SenpaiJepang.xcodeproj')
project.targets.each { |t| puts t.name }
