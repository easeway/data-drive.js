#!/usr/bin/env perl

use feature "switch";

use File::Basename;

sub embed_license {
    my $outfh = $_[0];
    my $input;
    open ($input, "<", $_[1]) or die "Unable to open $_[1]";
    while (<$input>) {
        print $outfh "// $_";
    }
    close ($input);
    print $outfh "\n\n";
}

sub merge_js {
    my $outfh = shift;
    my @src_files = @_;

    for (@src_files) {
        my $input;
        open ($input, "<", $_) or die "Unable to open $_";
        print $outfh "// " . basename($_) . "\n\n";
        my $state = "start";
        while (<$input>) {
            my $line = $_;
            given ($state) {
                when ("start") {
                    if ($line =~ /^\/\/\s[-]+$/) {
                        $state = "copy";
                    }
                }
                when ("copy") {
                    if ($line !~ /^\s*\/\/#require\s+.*$/) {
                        print $outfh $line;
                    }
                }
            }
        }
        print $outfh "\n\n";
        close ($input);
    }
}

my $OUT_CORE = "data-drive-core.js";
my $LIC_FILE = "LICENSE";
my $DIR_CORE = "src/dd.js/core";
my @SRC_CORE = ( "foundation.js", "adapter-jquery.js", "binding.js", "view.js" );

sub main {
    my $outfh;
    open ($outfh, ">", $OUT_CORE) or die "Unable to write to $OUT_CORE";
    embed_license ($outfh, $LIC_FILE) or die "Unable to open $LIC_FILE";
    merge_js ($outfh, map { "$DIR_CORE/" . $_ } @SRC_CORE);
    close ($outfh);
}

main
