                        }
                        if (cell.exits.W) {
                            if (ctx.buildFlange) ctx.buildFlange(cx - fOffset, ductY, cz, true, -1);
                            ctx.addGrate(cx - grateOffset, 0.37, cz, true, {width: 1.28, height: 0.74, fallDir: -1});
                        }
                    }
                }
            }
        }
    };
};
